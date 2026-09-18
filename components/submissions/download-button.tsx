"use client";

import { useState, useTransition } from "react";
import { getDownloadUrlAction } from "@/app/actions/submissions";

export function DownloadButton({ path, children = "下载文件" }: { path: string; children?: string }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      setError("");
      const result = await getDownloadUrlAction(path);
      if ("error" in result) {
        setError(result.error ?? "下载链接创建失败，请稍后重试。");
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={download} disabled={pending} className="text-sm font-medium text-indigo-700 hover:text-indigo-900 disabled:opacity-60">
        {pending ? "正在准备…" : children}
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </span>
  );
}
