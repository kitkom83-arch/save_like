import type { Prisma } from "@prisma/client";
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

const statusValues = ["healthy", "broken", "paused"] as const;
const sortValues = ["updated", "newest", "clicks"] as const;
const pageSize = 10;

type StatusFilter = (typeof statusValues)[number];
type SortKey = (typeof sortValues)[number];
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(searchParams: Awaited<SearchParams>, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function buildQueryString(
  current: Record<string, string>,
  overrides: Record<string, string | number | null>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function LinksPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedSearchParams = await searchParams;
  const { locale, t, localize } = await getServerI18n();
  const dateLocale = getLocaleDateFormat(locale);
  const query = readParam(resolvedSearchParams, "q").trim();
  const statusParam = readParam(resolvedSearchParams, "status").trim();
  const status = statusValues.includes(statusParam as StatusFilter) ? (statusParam as StatusFilter) : "";
  const sortParam = readParam(resolvedSearchParams, "sort").trim();
  const sort = sortValues.includes(sortParam as SortKey) ? (sortParam as SortKey) : "updated";
  const requestedPage = Math.max(1, Number(readParam(resolvedSearchParams, "page")) || 1);
  const where: Prisma.LinkWhereInput = {};

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { shortCode: { contains: query, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const orderBy: Prisma.LinkOrderByWithRelationInput =
    sort === "clicks"
      ? { clickCount: "desc" }
      : sort === "newest"
        ? { createdAt: "desc" }
        : { updatedAt: "desc" };

  const currentQuery = {
    q: query,
    status,
    sort,
  };
  const [totalLinks, baseUrl] = await Promise.all([
    prisma.link.count({ where }),
    getBaseUrl(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalLinks / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const links = await prisma.link.findMany({
    where,
    orderBy,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    include: {
      _count: { select: { clickLogs: true } },
      clickLogs: {
        orderBy: { clickedAt: "desc" },
        take: 1,
        select: { clickedAt: true },
      },
    },
  });
  const listBase = localize("/dashboard/links");
  const exportQuery = buildQueryString(currentQuery, {});

  return (
    <main className="container grid links-list-page">
      <div className="action-bar">
        <Link href={localize("/dashboard")}><button className="secondary">{t("nav.backDashboard", "Back to Dashboard")}</button></Link>
        <Link href={localize("/dashboard/links/new")}><button>{t("nav.newLink", "New Link")}</button></Link>
        <a href={`/api/links/export${exportQuery}`}>
          <button type="button" className="secondary">{t("links.export.links", "Export Links CSV")}</button>
        </a>
        <a href="/api/links/click-logs/export">
          <button type="button" className="secondary">{t("links.export.clickLogs", "Export Click Logs CSV")}</button>
        </a>
      </div>

      <form className="card filter-panel" action={listBase}>
        <div>
          <label htmlFor="links-q">{t("links.filters.search", "Search")}</label>
          <input
            id="links-q"
            name="q"
            defaultValue={query}
            placeholder={t("links.filters.searchPlaceholder", "Name or short code")}
          />
        </div>
        <div>
          <label htmlFor="links-status">{t("links.filters.status", "Status")}</label>
          <select id="links-status" name="status" defaultValue={status}>
            <option value="">{t("links.filters.allStatuses", "All statuses")}</option>
            {statusValues.map((item) => (
              <option key={item} value={item}>{t(`status.${item}`, item)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="links-sort">{t("links.filters.sort", "Sort")}</label>
          <select id="links-sort" name="sort" defaultValue={sort}>
            <option value="updated">{t("links.filters.sortUpdated", "Latest updated")}</option>
            <option value="newest">{t("links.filters.sortNewest", "Newest created")}</option>
            <option value="clicks">{t("links.filters.sortClicks", "Clicks")}</option>
          </select>
        </div>
        <div className="filter-actions">
          <button type="submit">{t("links.filters.apply", "Apply")}</button>
          <Link href={listBase}><button type="button" className="secondary">{t("links.filters.reset", "Reset")}</button></Link>
        </div>
      </form>

      <div className="card">
        <div className="section-head">
          <h1>{t("links.title", "Manage Links")}</h1>
          <p className="small">
            {t("links.description", "Manage links per row. Each row shows click count and quick actions.")}
          </p>
          <p className="small">
            {t("links.pagination.summary", "Showing {{shown}} of {{total}} links", {
              shown: links.length,
              total: totalLinks,
            })}
          </p>
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
                  <CopyLinkButton url={shortUrl} />
                  <a href={shortUrl} target="_blank" rel="noreferrer">
                    <button type="button" className="secondary">{t("links.actions.open", "Open")}</button>
                  </a>
                  <Link href={localize(`/dashboard/links/${link.id}/edit`)}><button className="secondary">{t("links.actions.edit", "Edit")}</button></Link>
                  <DeleteLinkButton id={link.id} />
                </div>
              </article>
            );
          })}
          {links.length === 0 ? (
            <div className="form-section">{t("links.empty", "No links yet")}</div>
          ) : null}
        </div>

        <div className="pagination-bar">
          <div className="small">
            {t("links.pagination.page", "Page {{page}} of {{totalPages}}", {
              page: currentPage,
              totalPages,
            })}
          </div>
          <div className="pagination-actions">
            {currentPage > 1 ? (
              <Link href={`${listBase}${buildQueryString(currentQuery, { page: currentPage - 1 })}`}>
                <button type="button" className="secondary">{t("links.pagination.previous", "Previous")}</button>
              </Link>
            ) : (
              <button type="button" className="secondary" disabled>{t("links.pagination.previous", "Previous")}</button>
            )}
            {currentPage < totalPages ? (
              <Link href={`${listBase}${buildQueryString(currentQuery, { page: currentPage + 1 })}`}>
                <button type="button" className="secondary">{t("links.pagination.next", "Next")}</button>
              </Link>
            ) : (
              <button type="button" className="secondary" disabled>{t("links.pagination.next", "Next")}</button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
