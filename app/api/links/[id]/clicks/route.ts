import { maskIpForDisplay } from "@/lib/ip-mask";
import { getPrivacyConfig } from "@/lib/privacy-config";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const link = await prisma.link.findUnique({ where: { id }, select: { id: true } });
  if (!link) {
    return Response.json({ ok: false, error: { code: "LINK_NOT_FOUND", message: "ไม่พบลิงก์นี้" } }, { status: 404 });
  }

  const clicks = await prisma.clickLog.findMany({
    where: { linkId: id },
    orderBy: { clickedAt: "desc" },
    take: 100,
  });

  const privacy = getPrivacyConfig();
  const sanitizedClicks = clicks.map((click) => ({
    ...click,
    ipAddress: privacy.maskIp ? maskIpForDisplay(click.ipAddress) : click.ipAddress,
  }));

  return Response.json({ ok: true, data: sanitizedClicks });
}
