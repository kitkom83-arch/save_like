"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

export default function DeleteLinkButton({ id, redirectTo }: { id: string; redirectTo?: string }) {
  const { t, localize } = useI18n();
  const router = useRouter();

  async function handleDelete() {
    const ok = window.confirm(t("common.confirmDelete", "Confirm deleting this link?"));
    if (!ok) return;

    const response = await fetch(`/api/links/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert(t("common.deleteFail", "Delete failed"));
      return;
    }

    if (redirectTo) {
      router.push(localize(redirectTo));
    }
    router.refresh();
  }

  return (
    <button className="danger" onClick={handleDelete}>{t("common.delete", "Delete")}</button>
  );
}
