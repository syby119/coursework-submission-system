import { t, type Locale } from "@/lib/i18n";

export function DownloadButton({ submissionId, locale, children }: { submissionId: string; locale: Locale; children?: string }) {
  return (
    <a href={`/api/submissions/${submissionId}/download`} className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
      {children ?? t(locale, "downloadFile")}
    </a>
  );
}
