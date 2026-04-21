"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import type { LinkStatus } from "@/lib/link-status";

type LinkStatusControlsProps = {
  id: string;
  initialStatus: LinkStatus;
  compact?: boolean;
};

const STATUS_LABELS: Record<LinkStatus, string> = {
  healthy: "healthy",
  paused: "paused",
  broken: "broken",
};

export default function LinkStatusControls({
  id,
  initialStatus,
  compact = false,
}: LinkStatusControlsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState<LinkStatus>(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<LinkStatus | null>(null);

  async function handleStatusChange(nextStatus: LinkStatus) {
    if (nextStatus === status || loadingStatus) {
      return;
    }

    setMessage(null);
    setLoadingStatus(nextStatus);

    try {
      const response = await fetch(`/api/links/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(result?.error?.message || t("status.updateFail", "Failed to update status"));
        return;
      }

      setStatus(result?.data?.status ?? nextStatus);
      setMessage(t("status.updateSuccess", "Status updated"));
      router.refresh();
    } catch {
      setMessage(t("status.updateFail", "Failed to update status"));
    } finally {
      setLoadingStatus(null);
    }
  }

  return (
    <div className="grid" style={{ gap: 8 }}>
      <div className={compact ? "row wrap" : "grid"} style={{ gap: 8 }}>
        <span className={`badge ${status}`}>{t(`status.${STATUS_LABELS[status]}`, STATUS_LABELS[status])}</span>
        <div className={`status-controls${compact ? " compact" : ""}`}>
          {(["healthy", "paused", "broken"] as LinkStatus[]).map((option) => (
            <button
              key={option}
              type="button"
              className={`secondary status-button${status === option ? " active" : ""}`}
              disabled={Boolean(loadingStatus)}
              onClick={() => handleStatusChange(option)}
            >
              {loadingStatus === option
                ? t("status.updating", "Updating...")
                : t(`status.${option}`, option)}
            </button>
          ))}
        </div>
      </div>
      {message ? <p className="small">{message}</p> : null}
    </div>
  );
}
