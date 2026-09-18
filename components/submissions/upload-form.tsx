"use client";

import { useRef, useState, useTransition } from "react";
import { finalizeSubmissionAction, prepareSubmissionAction } from "@/app/actions/submissions";
import { createClient } from "@/lib/supabase/client";
import { MAX_FILE_SIZE, validateSubmissionFile } from "@/lib/validation/submission";

export function UploadForm({ assignmentId, disabled }: { assignmentId: string; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("请选择要提交的文件。");
      return;
    }
    const validation = validateSubmissionFile(file.name, file.size);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    startTransition(async () => {
      setError("");
      setMessage("正在检查作业状态…");
      const preparation = await prepareSubmissionAction(assignmentId, file.name, file.size);
      if (!preparation.success) {
        setMessage("");
        setError(preparation.error);
        return;
      }

      setMessage("正在上传文件…");
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("submissions").upload(preparation.path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadError) {
        setMessage("");
        setError("文件上传失败。请检查网络、文件类型和大小后重试。");
        return;
      }

      setMessage("正在保存提交记录…");
      const finalization = await finalizeSubmissionAction({
        assignmentId,
        path: preparation.path,
        filename: file.name,
        fileSize: file.size,
      });
      if (!finalization.success) {
        setMessage("");
        setError(finalization.error);
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      setError("");
      setMessage("提交成功，页面状态已更新。");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input ref={inputRef} type="file" accept=".pdf,.zip,.doc,.docx,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={disabled || pending} className="block w-full rounded-lg border border-slate-300 bg-white text-sm file:mr-4 file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:font-medium file:text-indigo-700" />
      <p className="text-xs text-slate-500">支持 PDF、ZIP、DOC、DOCX，最大 {MAX_FILE_SIZE / 1024 / 1024} MB。</p>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p> : null}
      <button type="submit" disabled={disabled || pending} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "处理中…" : "提交作业"}
      </button>
    </form>
  );
}
