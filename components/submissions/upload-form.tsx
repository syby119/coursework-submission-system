"use client";

import { useId, useState, useTransition } from "react";
import { MAX_FILE_SIZE, validateSubmissionFile } from "@/lib/validation/submission";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export function UploadForm({ assignmentId, disabled, locale }: { assignmentId: string; disabled: boolean; locale: Locale }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [selectedFileName, setSelectedFileName] = useState("");
  const router = useRouter();
  const fileInputId = useId();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError(t(locale, "selectSubmissionFile"));
      return;
    }
    const validation = validateSubmissionFile(file.name, file.size, locale);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    startTransition(async () => {
      setError("");
      setMessage(t(locale, "uploading"));
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/submission`, {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });
        const result = await response.json().catch(() => ({ error: t(locale, "invalidUploadResponse") })) as { success?: boolean; error?: string };
        if (!response.ok || !result.success) {
          setMessage("");
          setError(result.error ?? t(locale, "uploadFailed"));
          return;
        }
        form.reset();
        setSelectedFileName("");
        setError("");
        setMessage(t(locale, "uploadSuccess"));
        router.refresh();
      } catch (uploadError) {
        console.error("Submission upload request failed", uploadError);
        setMessage("");
        setError(t(locale, "uploadNetworkFailed"));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          id={fileInputId}
          name="file"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          disabled={disabled || pending}
          onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}
          className="sr-only"
        />
        <label
          htmlFor={fileInputId}
          className={`cursor-pointer rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 ${disabled || pending ? "pointer-events-none cursor-not-allowed opacity-50" : ""}`}
        >
          {t(locale, "chooseFile")}
        </label>
        <span className={`max-w-full truncate text-sm ${selectedFileName ? "text-slate-700" : "text-slate-500"}`} title={selectedFileName || undefined}>
          {selectedFileName || t(locale, "noFileSelected")}
        </span>
      </div>
      <p className="text-xs text-slate-500">{t(locale, "zipLimit", { size: MAX_FILE_SIZE / 1024 / 1024 })}</p>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p> : null}
      <button type="submit" disabled={disabled || pending} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? t(locale, "processing") : t(locale, "submitAssignment")}
      </button>
    </form>
  );
}
