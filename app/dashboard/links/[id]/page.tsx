import { notFound } from "next/navigation";
import Link from "next/link";
import { buildClickAnalytics } from "@/lib/click-analytics";
import ConsentPolicyCard from "@/components/consent-policy-card";
import { getPrivacyConfig } from "@/lib/privacy-config";
import { prisma } from "@/lib/prisma";
import CopyLinkButton from "@/components/copy-link-button";
import DeleteLinkButton from "@/components/delete-link-button";
import LinkStatusControls from "@/components/link-status-controls";
import { parseLinkMetadata } from "@/lib/link-metadata";
import RunLinkHealthCheckButton from "@/components/run-link-health-check-button";
import { getBaseUrl } from "@/lib/base-url";
import { getLocaleDateFormat } from "@/lib/i18n/config";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LinkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, t, localize } = await getServerI18n();
  const dateLocale = getLocaleDateFormat(locale);

  const [link, baseUrl, totalClickLogs, fallbackUsed, pausedHits] = await Promise.all([
    prisma.link.findUnique({
      where: { id },
      include: {
        clickLogs: {
          orderBy: { clickedAt: "desc" },
          take: 50,
        },
      },
    }),
    getBaseUrl(),
    prisma.clickLog.count({ where: { linkId: id } }),
    prisma.clickLog.count({ where: { linkId: id, outcome: "fallback" } }),
    prisma.clickLog.count({ where: { linkId: id, outcome: "paused" } }),
  ]);

  if (!link) {
    notFound();
  }

  const shortUrl = `${baseUrl}/${link.shortCode}`;
  const qrUrl = `/api/links/${link.id}/qr`;
  const totalClicks = Math.max(link.clickCount, totalClickLogs);
  const latestClick = link.clickLogs[0]?.clickedAt ?? null;
  const metadata = parseLinkMetadata(link.note);
  const analytics = await buildClickAnalytics(link.clickLogs);
  const privacy = getPrivacyConfig();

  return (
    <main className="container grid">
      <div className="action-bar">
        <Link href={localize("/dashboard/links")}><button className="secondary">{t("nav.backLinks", "Back to Links")}</button></Link>
        <Link href={localize(`/dashboard/links/${link.id}/edit`)}><button>{t("common.edit", "Edit")}</button></Link>
      </div>

      <div className="card grid">
        <div className="row wrap" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ marginBottom: 8 }}>{link.title}</h1>
            <div className="small">{t("links.detail.description", "Per-link detail and logs for this specific link.")}</div>
          </div>
          <div style={{ minWidth: 320, maxWidth: "100%" }}>
            <LinkStatusControls id={link.id} initialStatus={link.status} />
          </div>
        </div>

        <div className="grid grid-2">
          <div>
            <p className="small">{t("links.detail.currentStatus", "Current Status")}</p>
            <span className={`badge ${link.status}`}>{t(`status.${link.status}`, link.status)}</span>
          </div>
          <div>
            <p className="small">{t("links.detail.shortCode", "Short Code")}</p>
            <div className="code">/{link.shortCode}</div>
          </div>
          <div>
            <p className="small">{t("links.detail.shortLink", "Short Link")}</p>
            <div className="code">{shortUrl}</div>
          </div>
          <div>
            <p className="small">{t("links.detail.primaryUrl", "Primary URL")}</p>
            <div className="code">{link.primaryUrl}</div>
          </div>
          <div>
            <p className="small">{t("links.detail.fallbackUrl", "Fallback URL")}</p>
            <div className="code">{link.fallbackUrl}</div>
          </div>
          <div>
            <p className="small">{t("links.detail.campaignName", "Campaign Name")}</p>
            <div>{metadata.campaignName || t("common.notAvailable", "-")}</div>
          </div>
          <div>
            <p className="small">{t("links.detail.source", "Source")}</p>
            <div>{metadata.source || t("common.notAvailable", "-")}</div>
          </div>
          <div>
            <p className="small">{t("links.detail.medium", "Medium")}</p>
            <div>{metadata.medium || t("common.notAvailable", "-")}</div>
          </div>
        </div>

        <div className="grid grid-4">
          <div className="form-section">
            <p className="small">{t("links.detail.clicks", "Total Clicks")}</p>
            <h2>{totalClicks}</h2>
          </div>
          <div className="form-section">
            <p className="small">{t("links.detail.latestClick", "Latest Click")}</p>
            <h2 style={{ fontSize: 18 }}>{latestClick ? new Date(latestClick).toLocaleString(dateLocale) : t("common.notAvailable", "-")}</h2>
          </div>
          <div className="form-section">
            <p className="small">{t("links.detail.fallbackUsed", "Fallback Used")}</p>
            <h2>{fallbackUsed}</h2>
          </div>
          <div className="form-section">
            <p className="small">{t("links.detail.pausedHits", "Paused Hits")}</p>
            <h2>{pausedHits}</h2>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="form-section">
            <p className="small">{t("links.detail.createdAt", "Created At")}</p>
            <h2 style={{ fontSize: 18 }}>{new Date(link.createdAt).toLocaleString(dateLocale)}</h2>
          </div>
          <div className="form-section">
            <p className="small">{t("links.detail.updatedAt", "Updated At")}</p>
            <h2 style={{ fontSize: 18 }}>{new Date(link.updatedAt).toLocaleString(dateLocale)}</h2>
          </div>
        </div>

        {metadata.noteText ? (
          <div>
            <p className="small">{t("links.detail.note", "Note")}</p>
            <div className="form-section">{metadata.noteText}</div>
          </div>
        ) : null}

        <div className="form-section">
          <h2>{t("links.detail.qrTitle", "QR Code")}</h2>
          <div className="grid grid-2">
            <div>
              <img src={qrUrl} alt={`QR for ${link.shortCode}`} className="qr-image" />
            </div>
            <div className="grid">
              <div className="code">{shortUrl}</div>
              <a href={qrUrl} target="_blank" rel="noreferrer">
                <button type="button" className="secondary">{t("links.detail.openQr", "Open QR in new tab")}</button>
              </a>
              <a href={`${qrUrl}?download=1`}>
                <button type="button">{t("links.detail.downloadQr", "Download QR")}</button>
              </a>
            </div>
          </div>
        </div>

        <div className="row wrap">
          <a href={shortUrl} target="_blank" rel="noreferrer"><button type="button" className="secondary">{t("links.detail.openLink", "Open Link")}</button></a>
          <Link href={localize(`/dashboard/links/${link.id}/edit`)}><button type="button" className="secondary">{t("common.edit", "Edit")}</button></Link>
          <a href={`/api/links/click-logs/export?linkId=${encodeURIComponent(link.id)}`}>
            <button type="button" className="secondary">{t("links.export.clickLogs", "Export Click Logs CSV")}</button>
          </a>
          <div style={{ width: 160 }}>
            <CopyLinkButton url={shortUrl} />
          </div>
          <div style={{ width: 160 }}>
            <DeleteLinkButton id={link.id} redirectTo="/dashboard/links" />
          </div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <RunLinkHealthCheckButton id={link.id} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h2>{t("links.detail.analyticsTitle", "Analytics")}</h2>
          <p className="small">{t("dashboard.approxNotice", "Location is approximate from IP and is not GPS.")}</p>
        </div>
        <div className="grid grid-2">
          <div>
            <p className="small">{t("links.detail.topCountries", "Top Countries")}</p>
            {analytics.topCountries.length > 0 ? analytics.topCountries.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            )) : <div className="small">{t("common.empty", "No data")}</div>}
          </div>
          <div>
            <p className="small">{t("links.detail.topDevices", "Top Devices")}</p>
            {analytics.topDevices.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            ))}
          </div>
          <div>
            <p className="small">{t("links.detail.topBrowsers", "Top Browsers")}</p>
            {analytics.topBrowsers.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            ))}
          </div>
          <div>
            <p className="small">{t("links.detail.botVsHuman", "Bot vs Human")}</p>
            {analytics.botVsHuman.map((item) => (
              <div key={item.label}>{item.label} ({item.count})</div>
            ))}
          </div>
        </div>
      </div>

      <ConsentPolicyCard
        metadata={metadata}
        privacyMode={privacy.privacyMode}
        maskIp={privacy.maskIp}
        enableExactLocation={privacy.enableExactLocation}
        enableFingerprinting={privacy.enableFingerprinting}
      />

      <div className="card">
        <div className="section-head">
          <h2>{t("links.detail.logTitle", "Click Logs")}</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("links.detail.table.time", "Time")}</th>
                <th>{t("links.detail.table.outcome", "Outcome")}</th>
                <th>{t("links.detail.table.ip", "IP")}</th>
                <th>{t("links.detail.table.approxLocation", "Approx. Location")}</th>
                <th>{t("links.detail.table.device", "Device")}</th>
                <th>{t("links.detail.table.browserOs", "Browser / OS")}</th>
                <th>{t("links.detail.table.referer", "Referer")}</th>
              </tr>
            </thead>
            <tbody>
              {analytics.enrichedLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.clickedAt).toLocaleString(dateLocale)}</td>
                  <td>{log.outcome}</td>
                  <td>{log.displayIp || t("common.notAvailable", "-")}</td>
                  <td>{log.approximateCity || log.approximateCountry || t("common.unknown", "Unknown")}</td>
                  <td>{log.deviceTypeResolved || t("common.unknown", "Unknown")}</td>
                  <td>{log.browser} / {log.os}</td>
                  <td>{log.referer || t("common.notAvailable", "-")}</td>
                </tr>
              ))}
              {link.clickLogs.length === 0 ? (
                <tr>
                  <td colSpan={7}>{t("links.detail.noClicks", "No clicks for this link yet")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
