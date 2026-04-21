"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";

type CopyLinkButtonProps = {
  url: string;
};

export default function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt(t("common.copy", "Copy"), url);
    }
  }

  return (
    <button type="button" className="secondary" onClick={handleCopy}>
      {copied ? t("common.copied", "Copied") : t("common.copy", "Copy")}
    </button>
  );
}
