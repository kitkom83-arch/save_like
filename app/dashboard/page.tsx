import Link from "next/link";
import PrivacySettingsCard from "@/components/privacy-settings-card";
import { buildClickAnalytics } from "@/lib/click-analytics";
import { getLocaleDateFormat } from "@/lib/i18n/config";
import { getServerI18n } from "@/lib/i18n/server";
import { getPrivacyConfig } from "@/lib/privacy-config";
import { prisma } from "@/lib/prisma";
import RunHealthCheckButton from "@/components/run-health-check-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { locale, t, localize } = await getServerI18n();
  const dateLocale = getLocaleDateFormat(locale);
  const [totalLinks, totalHealthy, totalBroken, totalPaused, totalClicks, latestLinks, recentLogs] = await Promise.all([
    prisma.link.count(),
    prisma.link.count({ where: { status: "healthy" } }),
    prisma.link.count({ where: { status: "broken" } }),
    prisma.link.count({ where: { status: "paused" } }),
    prisma.clickLog.count(),
    prisma.link.findMany({ orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.clickLog.findMany({ orderBy: { clickedAt: "desc" }, take: 50 }),
  ]);
  const analytics = await buildClickAnalytics(recentLogs);
  const privacy = getPrivacyConfig();

  const cards = [
    { label: t("dashboard.cards.totalLinks", "Total Links"), value: totalLinks },
    { label: t("dashboard.cards.healthy", "healthy"), value: totalHealthy },
    { label: t("dashboard.cards.broken", "broken"), value: totalBroken },
    { label: t("dashboard.cards.paused", "paused"), value: totalPaused },
    { label: t("dashboard.cards.totalClicks", "Total Clicks"), value: totalClicks },
  ];

  return (
    <main className="container grid">
      <div className="action-bar">
        <Link href={localize("/")}><button className="secondary">{t("nav.home", "Home")}</button></Link>
        <Link href={localize("/dashboard/links")}><button>{t("nav.links", "Links")}</button></Link>
        <Link href={localize("/dashboard/links/new")}><button className="secondary">{t("nav.newLink", "New Link")}</button></Link>
        <Link href={localize("/dashboard/logs")}><button className="secondary">{t("nav.logs", "Logs")}</button></Link>
      </div>

      <div className="card">
        <div className="section-head">
          <h2>{t("dashboard.healthCheck", "Health Check")}</h2>
          <p className="small">{t("dashboard.healthCheckDescription", "Check links health status automatically.")}</p>
        </div>
        <div style={{ maxWidth: 360 }}>
          <RunHealthCheckButton />
        </div>
      </div>

      <PrivacySettingsCard
        privacyMode={privacy.privacyMode}
        maskIp={privacy.maskIp}
        enableExactLocation={privacy.enableExactLocation}
        enableFingerprinting={privacy.enableFingerprinting}
      />
      <div className="stat-grid">
        {cards.map((item) => (
          <div className="stat-card" key={item.label}>
            <p className="small">{item.label}</p>
            <p className="stat-value">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-head">
          <h2>{t("dashboard.latestLinks", "Latest Links")}</h2>
          <p className="small">{t("dashboard.latestLinksDescription", "System summary.")}</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("dashboard.table.name", "Name")}</th>
                <th>{t("dashboard.table.shortCode", "Short Code")}</th>
                <th>{t("dashboard.table.status", "Status")}</th>
                <th>{t("dashboard.table.clicks", "Clicks")}</th>
                <th>{t("dashboard.table.updatedAt", "Updated")}</th>
                <th>{t("dashboard.table.action", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {latestLinks.map((link) => (
                <tr key={link.id}>
                  <td>{link.title}</td>
                  <td className="code">/{link.shortCode}</td>
                  <td><span className={`badge ${link.status}`}>{t(`status.${link.status}`, link.status)}</span></td>
                  <td>{link.clickCount}</td>
                  <td>{new Date(link.updatedAt).toLocaleString(dateLocale)}</td>
                  <td>
                    <Link href={localize(`/dashboard/links/${link.id}`)}><button className="secondary">{t("nav.goDetail", "Detail")}</button></Link>
                  </td>
                </tr>
              ))}
              {latestLinks.length === 0 ? (
                <tr>
                  <td colSpan={6}>{t("dashboard.emptyRecentLinks", "No links yet")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card grid">
        <div>
          <h2>{t("dashboard.visitors", "Visitors")}</h2>
          <p className="small">{t("dashboard.approxNotice", "Approximate from IP.")}</p>
        </div>
        <div className="grid grid-2">
          <div>
            <p className="small">{t("dashboard.topCountries", "Top Countries")}</p>
            {analytics.topCountries.length > 0 ? analytics.topCountries.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            )) : <div className="small">{t("common.empty", "No data")}</div>}
          </div>
          <div>
            <p className="small">{t("dashboard.topCities", "Top Cities (approximate)")}</p>
            {analytics.topCities.length > 0 ? analytics.topCities.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            )) : <div className="small">{t("common.empty", "No data")}</div>}
          </div>
          <div>
            <p className="small">{t("dashboard.topBrowsers", "Top Browsers")}</p>
            {analytics.topBrowsers.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            ))}
          </div>
          <div>
            <p className="small">{t("dashboard.topOs", "Top OS")}</p>
            {analytics.topOs.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            ))}
          </div>
          <div>
            <p className="small">{t("dashboard.deviceBreakdown", "Device Breakdown")}</p>
            {analytics.topDevices.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            ))}
          </div>
          <div>
            <p className="small">{t("dashboard.botVsHuman", "Bot vs Human")}</p>
            {analytics.botVsHuman.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            ))}
          </div>
        </div>
        <div>
          <p className="small">{t("dashboard.topReferrers", "Top Referrers")}</p>
          {analytics.topReferrers.length > 0 ? analytics.topReferrers.map((item) => (
            <div key={item.label}>{item.label} ({item.count})</div>
          )) : <div className="small">{t("common.empty", "No data")}</div>}
        </div>
        <div>
          <p className="small">{t("dashboard.recentClicks", "Recent Enriched Clicks")}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("dashboard.table.shortCode", "Short Code")}</th>
                  <th>{t("dashboard.table.approxLocation", "Approx. Location")}</th>
                  <th>{t("dashboard.table.browserOs", "Browser / OS")}</th>
                  <th>{t("dashboard.table.device", "Device")}</th>
                  <th>{t("dashboard.table.time", "Time")}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.enrichedLogs.slice(0, 10).map((log) => (
                  <tr key={log.id}>
                    <td className="code">/{log.shortCode}</td>
                    <td>{log.approximateCity || log.approximateCountry || t("common.unknown", "Unknown")}</td>
                    <td>{log.browser} / {log.os}</td>
                    <td>{log.deviceTypeResolved}</td>
                    <td>{new Date(log.clickedAt).toLocaleString(dateLocale)}</td>
                  </tr>
                ))}
                {analytics.enrichedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5}>{t("dashboard.emptyRecentClicks", "No visitor data yet")}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
