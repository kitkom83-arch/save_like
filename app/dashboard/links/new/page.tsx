import Link from "next/link";
import LinkFormClient from "@/components/link-form-client";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewLinkPage() {
  const { t, localize } = await getServerI18n();

  return (
    <main className="container grid">
      <div className="action-bar">
        <Link href={localize("/dashboard/links")}><button className="secondary">{t("nav.backLinks", "Back to Links")}</button></Link>
      </div>
      <div className="section-head">
        <h1>{t("links.newTitle", "Create New Link")}</h1>
      </div>
      <LinkFormClient mode="create" />
    </main>
  );
}
