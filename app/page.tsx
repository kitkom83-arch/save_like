import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

export default async function HomePage() {
  const { t, localize } = await getServerI18n();

  return (
    <main className="container">
      <div className="card">
        <h1>{t("home.heading", "Link Shortener")}</h1>
        <p>{t("home.description", "Manage links and analytics in one place.")}</p>
        <div className="row wrap">
          <Link href={localize("/dashboard")}><button>{t("home.openDashboard", "Open Dashboard")}</button></Link>
          <Link href={localize("/dashboard/links/new")}><button className="secondary">{t("home.newLink", "New Link")}</button></Link>
          <Link href="/api/links"><button className="secondary">{t("home.openApi", "Open API /api/links")}</button></Link>
        </div>
      </div>
    </main>
  );
}
