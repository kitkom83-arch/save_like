import { sendBrokenAlert } from "@/lib/alerts";
import { serializeLinkMetadata } from "@/lib/link-metadata";
import { prisma } from "@/lib/prisma";
import { isLinkStatus } from "@/lib/link-status";
import { isValidUrl, normalizeShortCode } from "@/lib/validators";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const link = await prisma.link.findUnique({ where: { id } });

  if (!link) {
    return Response.json({ ok: false, error: { code: "LINK_NOT_FOUND", message: "ไม่พบลิงก์นี้" } }, { status: 404 });
  }

  return Response.json({ ok: true, data: link });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = await prisma.link.findUnique({ where: { id } });

  if (!existing) {
    return Response.json({ ok: false, error: { code: "LINK_NOT_FOUND", message: "ไม่พบลิงก์นี้" } }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (
    body.note !== undefined ||
    body.campaignName !== undefined ||
    body.source !== undefined ||
    body.medium !== undefined ||
    body.consentMode !== undefined ||
    body.consentCategories !== undefined ||
    body.consentPreset !== undefined ||
    body.customConsentTitle !== undefined ||
    body.customConsentMessage !== undefined ||
    body.redirectAfterReject !== undefined
  ) {
    data.note = serializeLinkMetadata({
      campaignName: body.campaignName,
      source: body.source,
      medium: body.medium,
      noteText: body.note,
      consentMode: body.consentMode,
      consentCategories: body.consentCategories,
      consentPreset: body.consentPreset,
      customConsentTitle: body.customConsentTitle,
      customConsentMessage: body.customConsentMessage,
      redirectAfterReject: body.redirectAfterReject,
    });
  }
  if (body.status !== undefined) {
    if (!isLinkStatus(body.status)) {
      return Response.json(
        { ok: false, error: { code: "STATUS_INVALID", message: "status ต้องเป็น healthy, paused หรือ broken" } },
        { status: 400 }
      );
    }

    data.status = body.status;
  }

  if (body.primaryUrl !== undefined) {
    const primaryUrl = String(body.primaryUrl).trim();
    if (!isValidUrl(primaryUrl)) {
      return Response.json({ ok: false, error: { code: "PRIMARY_URL_INVALID", message: "primaryUrl ไม่ถูกต้อง" } }, { status: 400 });
    }
    data.primaryUrl = primaryUrl;
  }

  if (body.fallbackUrl !== undefined) {
    const fallbackUrl = String(body.fallbackUrl).trim();
    if (!isValidUrl(fallbackUrl)) {
      return Response.json({ ok: false, error: { code: "FALLBACK_URL_INVALID", message: "fallbackUrl ไม่ถูกต้อง" } }, { status: 400 });
    }
    data.fallbackUrl = fallbackUrl;
  }

  if (body.shortCode !== undefined) {
    const shortCode = normalizeShortCode(String(body.shortCode));
    const conflict = await prisma.link.findFirst({
      where: {
        shortCode,
        NOT: { id },
      },
      select: { id: true },
    });

    if (conflict) {
      return Response.json({ ok: false, error: { code: "SHORT_CODE_EXISTS", message: "shortCode นี้ถูกใช้แล้ว" } }, { status: 409 });
    }

    data.shortCode = shortCode;
  }

  const updated = await prisma.link.update({
    where: { id },
    data,
  });

  if (existing.status !== "broken" && updated.status === "broken") {
    await sendBrokenAlert({
      shortCode: updated.shortCode,
      title: updated.title,
      primaryUrl: updated.primaryUrl,
      fallbackUrl: updated.fallbackUrl,
      status: updated.status,
      checkedAt: new Date().toISOString(),
      reason: "manual update",
    });
  }

  return Response.json({ ok: true, data: updated });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const existing = await prisma.link.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ ok: false, error: { code: "LINK_NOT_FOUND", message: "ไม่พบลิงก์นี้" } }, { status: 404 });
  }

  await prisma.link.delete({ where: { id } });
  return Response.json({ ok: true, message: "ลบลิงก์เรียบร้อย" });
}
