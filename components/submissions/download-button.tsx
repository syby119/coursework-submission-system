export function DownloadButton({ submissionId, children = "下载文件" }: { submissionId: string; children?: string }) {
  return (
    <a href={`/api/submissions/${submissionId}/download`} className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
      {children}
    </a>
  );
}
