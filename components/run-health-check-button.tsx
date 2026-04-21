"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

type HealthCheckSummary = {
  checked: number;
  broken: number;
  recovered: number;
  skipped: number;
};

export default function RunHealthCheckButton() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/health-check/run", {
        method: "POST",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(data?.error?.message || t("healthCheck.failed", "Health check failed"));
        return;
      }

      const summary = data?.data as HealthCheckSummary | undefined;
      setMessage(
        t("healthCheck.summary", "Checked {{checked}} links, broken {{broken}}, recovered {{recovered}}, skipped {{skipped}}", {
          checked: summary?.checked ?? 0,
          broken: summary?.broken ?? 0,
          recovered: summary?.recovered ?? 0,
          skipped: summary?.skipped ?? 0,
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
        {loading ? t("healthCheck.running", "Checking...") : t("healthCheck.runNow", "Run Health Check Now")}
      </button>
      {message ? <p className="small">{message}</p> : null}
    </div>
  );
}
