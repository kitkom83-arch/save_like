import Link from "next/link";
import { buildClickAnalytics } from "@/lib/click-analytics";
import { getLocaleDateFormat } from "@/lib/i18n/config";
import { getServerI18n } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const { locale, t, localize } = await getServerI18n();
  const dateLocale = getLocaleDateFormat(locale);
  const logs = await prisma.clickLog.findMany({
    orderBy: { clickedAt: "desc" },
    take: 100,
  });
  const analytics = await buildClickAnalytics(logs);

  return (
    <main className="container grid">
      <div className="action-bar">
        <Link href={localize("/dashboard")}><button className="secondary">{t("nav.backDashboard", "Back to Dashboard")}</button></Link>
      </div>
      <div className="card">
        <div className="section-head">
          <h1>{t("logs.title", "System Click Logs")}</h1>
          <p className="small">{t("logs.description", "This page shows logs across all links. Open a link detail page for per-link logs.")}</p>
          <p className="small">{t("dashboard.approxNotice", "Location is approximate from IP and is not GPS.")}</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("logs.table.shortCode", "Short Code")}</th>
                <th>{t("logs.table.ip", "IP")}</th>
                <th>{t("logs.table.approxLocation", "Approx. Location")}</th>
                <th>{t("logs.table.device", "Device")}</th>
                <th>{t("logs.table.browserOs", "Browser / OS")}</th>
                <th>{t("logs.table.referer", "Referer")}</th>
                <th>{t("logs.table.time", "Time")}</th>
              </tr>
            </thead>
            <tbody>
              {analytics.enrichedLogs.map((log) => (
                <tr key={log.id}>
                  <td className="code">/{log.shortCode}</td>
                  <td>{log.displayIp || t("common.notAvailable", "-")}</td>
                  <td>{log.approximateCity || log.approximateCountry || t("common.unknown", "Unknown")}</td>
                  <td>{log.deviceTypeResolved || t("common.unknown", "Unknown")}</td>
                  <td>{log.browser} / {log.os}</td>
                  <td>{log.referer || t("common.notAvailable", "-")}</td>
                  <td>{new Date(log.clickedAt).toLocaleString(dateLocale)}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7}>{t("logs.empty", "No click logs yet")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
