"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

type RunLinkHealthCheckButtonProps = {
  id: string;
};

export default function RunLinkHealthCheckButton({ id }: RunLinkHealthCheckButtonProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/links/${id}/health-check`, {
        method: "POST",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(data?.error?.message || t("healthCheck.failed", "Health check failed"));
        return;
      }

      const result = data?.data?.results?.[0];
      if (!result) {
        setMessage(t("healthCheck.noResult", "No health-check result"));
        return;
      }

      setMessage(
        result.reason
          ? t("healthCheck.statusResultWithReason", "Status {{statusAfter}} ({{reason}})", {
              statusAfter: result.statusAfter,
              reason: result.reason,
            })
          : t("healthCheck.statusResult", "Status {{statusAfter}}", {
              statusAfter: result.statusAfter,
            })
      );
      router.refresh();
    } catch {
      setMessage(t("healthCheck.failed", "Health check failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 8 }}>
      <button type="button" className="secondary" onClick={handleRun} disabled={loading}>
        {loading ? t("healthCheck.running", "Checking...") : t("healthCheck.runLink", "Run Health Check for This Link")}
      </button>
      {message ? <p className="small">{message}</p> : null}
    </div>
  );
}
