"use client";

import { useState, useTransition } from "react";
import { MAX_FILE_SIZE, validateSubmissionFile } from "@/lib/validation/submission";
import { useRouter } from "next/navigation";

export function UploadForm({ assignmentId, disabled }: { assignmentId: string; disabled: boolean }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
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
      setMessage("正在上传文件…");
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/submission`, {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });
        const result = await response.json().catch(() => ({ error: "上传服务返回了无效响应。" })) as { success?: boolean; error?: string };
        if (!response.ok || !result.success) {
          setMessage("");
          setError(result.error ?? "文件上传失败，请稍后重试。");
          return;
        }
        form.reset();
        setError("");
        setMessage("提交成功，页面状态已更新。");
        router.refresh();
      } catch (uploadError) {
        console.error("Submission upload request failed", uploadError);
        setMessage("");
        setError("上传请求未能到达应用。请确认 pnpm dev 正在运行，且 Nginx 已成功代理到 127.0.0.1:3000。");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input name="file" type="file" accept=".zip,application/zip,application/x-zip-compressed" disabled={disabled || pending} className="block w-full rounded-lg border border-slate-300 bg-white text-sm file:mr-4 file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:font-medium file:text-indigo-700" />
      <p className="text-xs text-slate-500">仅支持 ZIP 压缩包，最大 {MAX_FILE_SIZE / 1024 / 1024} MB。</p>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p> : null}
      <button type="submit" disabled={disabled || pending} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "处理中…" : "提交作业"}
      </button>
    </form>
  );
}
