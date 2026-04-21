import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

export default async function PausedPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const { t, localize } = await getServerI18n();

  return (
    <main className="container paused-shell">
      <div className="paused-panel">
        <div className="badge paused">{t("paused.badge", "paused")}</div>
        <div className="section-head">
          <h1>{t("paused.title", "This link is temporarily paused")}</h1>
          <p className="small">
            {t("paused.description", "Short code /{{code}} is not available right now.", {
              code: code || t("common.unknown", "Unknown"),
            })}
          </p>
        </div>
        <div className="paused-copy">
          <p>{t("paused.copyMain", "The team can switch this link to healthy or broken from the dashboard.")}</p>
          <p className="small">{t("paused.copySub", "Once re-enabled, the same short link will work according to the latest status.")}</p>
        </div>
        <div className="action-bar paused-actions">
          <Link href={localize("/")}>
            <button type="button">{t("paused.backHome", "Back to Home")}</button>
          </Link>
          <Link href={localize("/dashboard")}>
            <button type="button" className="secondary">{t("paused.goDashboard", "Go to Dashboard")}</button>
          </Link>
        </div>
      </div>
    </main>
  );
}
