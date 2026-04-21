import Link from "next/link";
import { parseLinkMetadata } from "@/lib/link-metadata";
import { prisma } from "@/lib/prisma";
import DeleteLinkButton from "@/components/delete-link-button";
import CopyLinkButton from "@/components/copy-link-button";
import LinkStatusControls from "@/components/link-status-controls";
import { getBaseUrl } from "@/lib/base-url";
import { getLocaleDateFormat } from "@/lib/i18n/config";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const { locale, t, localize } = await getServerI18n();
  const dateLocale = getLocaleDateFormat(locale);
  const [links, baseUrl] = await Promise.all([
    prisma.link.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { clickLogs: true } },
        clickLogs: {
          orderBy: { clickedAt: "desc" },
          take: 1,
          select: { clickedAt: true },
        },
      },
    }),
    getBaseUrl(),
  ]);

  return (
    <main className="container grid links-list-page">
      <div className="action-bar">
        <Link href={localize("/dashboard")}><button className="secondary">{t("nav.backDashboard", "Back to Dashboard")}</button></Link>
        <Link href={localize("/dashboard/links/new")}><button>{t("nav.newLink", "New Link")}</button></Link>
      </div>

      <div className="card">
        <div className="section-head">
          <h1>{t("links.title", "Manage Links")}</h1>
          <p className="small">{t("links.description", "Manage links per row. Each row shows click count and quick actions.")}</p>
        </div>
        <div className="links-list">
          {links.map((link) => {
            const shortUrl = `${baseUrl}/${link.shortCode}`;
            const latestClick = link.clickLogs[0]?.clickedAt ?? null;
            const metadata = parseLinkMetadata(link.note);

            return (
              <article key={link.id} className="link-row-card">
                <div className="link-row-main">
                  <section className="link-row-block">
                    <h3 className="link-row-title">{link.title}</h3>
                    <div className="small code">/{link.shortCode}</div>
                    <div className="small code">{shortUrl}</div>
                  </section>

                  <section className="link-row-block">
                    <p className="small">{t("links.table.campaign", "Campaign")}</p>
                    <div>{metadata.campaignName || t("common.notAvailable", "-")}</div>
                    <p className="small">{t("links.table.sourceMedium", "Source / Medium")}</p>
                    <div>{metadata.source || t("common.notAvailable", "-")}</div>
                    <div className="small">{metadata.medium || t("common.notAvailable", "-")}</div>
                    {metadata.noteText ? <div className="small link-note">{metadata.noteText}</div> : null}
                  </section>

                  <section className="link-row-block">
                    <p className="small">Primary</p>
                    <div className="code">{link.primaryUrl}</div>
                    <p className="small">Fallback</p>
                    <div className="code">{link.fallbackUrl}</div>
                  </section>

                  <section className="link-row-block link-row-state">
                    <p className="small">{t("links.table.status", "Status")}</p>
                    <LinkStatusControls id={link.id} initialStatus={link.status} compact />
                    <p className="small">{t("links.table.consent", "Consent")}</p>
                    <span className="badge info">{t(`consent.modes.${metadata.consentMode}`, metadata.consentMode)}</span>
                  </section>

                  <section className="link-row-block">
                    <p className="small">{t("links.table.clicks", "Clicks")}</p>
                    <div>{link.clickCount || link._count.clickLogs}</div>
                    <p className="small">{t("links.table.latestClick", "Latest Click")}</p>
                    <div>{latestClick ? new Date(latestClick).toLocaleString(dateLocale) : t("common.notAvailable", "-")}</div>
                  </section>
                </div>

                <div className="link-row-actions">
                  <Link href={localize(`/dashboard/links/${link.id}`)}><button className="secondary">{t("links.actions.viewDetail", "View Detail")}</button></Link>
                  <Link href={localize(`/dashboard/links/${link.id}/edit`)}><button className="secondary">{t("links.actions.edit", "Edit")}</button></Link>
                  <a href={`/api/links/${link.id}/qr`} target="_blank" rel="noreferrer">
                    <button type="button" className="secondary">{t("links.actions.viewQr", "View QR")}</button>
                  </a>
                  <CopyLinkButton url={shortUrl} />
                  <a href={shortUrl} target="_blank" rel="noreferrer">
                    <button type="button" className="secondary">{t("links.actions.open", "Open")}</button>
                  </a>
                  <DeleteLinkButton id={link.id} />
                </div>
              </article>
            );
          })}
          {links.length === 0 ? (
            <div className="form-section">{t("links.empty", "No links yet")}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
