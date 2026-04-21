import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerI18n } from "@/lib/i18n/server";
import LinkFormClient from "@/components/link-form-client";

export const dynamic = "force-dynamic";

export default async function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, localize } = await getServerI18n();
  const link = await prisma.link.findUnique({ where: { id } });

  if (!link) {
    notFound();
  }

  return (
    <main className="container grid">
      <div className="action-bar">
        <Link href={localize(`/dashboard/links/${link.id}`)}><button className="secondary">{t("nav.backLinkDetail", "Back to Link Detail")}</button></Link>
      </div>
      <div className="section-head">
        <h1>{t("links.editTitle", "Edit Link")}</h1>
      </div>
      <LinkFormClient mode="edit" initialData={link} />
    </main>
  );
}
