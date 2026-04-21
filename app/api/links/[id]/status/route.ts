import { sendBrokenAlert } from "@/lib/alerts";
import { prisma } from "@/lib/prisma";
import { isLinkStatus } from "@/lib/link-status";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = await prisma.link.findUnique({
    where: { id },
    select: {
      id: true,
      shortCode: true,
      title: true,
      primaryUrl: true,
      fallbackUrl: true,
      status: true,
    },
  });

  if (!existing) {
    return Response.json(
      { ok: false, error: { code: "LINK_NOT_FOUND", message: "ไม่พบลิงก์นี้" } },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!isLinkStatus(body?.status)) {
    return Response.json(
      { ok: false, error: { code: "STATUS_INVALID", message: "status ต้องเป็น healthy, paused หรือ broken" } },
      { status: 400 }
    );
  }

  const updated = await prisma.link.update({
    where: { id },
    data: { status: body.status },
  });

  if (existing.status !== "broken" && updated.status === "broken") {
    await sendBrokenAlert({
      shortCode: updated.shortCode,
      title: updated.title,
      primaryUrl: updated.primaryUrl,
      fallbackUrl: updated.fallbackUrl,
      status: updated.status,
      checkedAt: new Date().toISOString(),
      reason: "status control",
    });
  }

  return Response.json({ ok: true, data: updated });
}
