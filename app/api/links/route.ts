import { serializeLinkMetadata } from "@/lib/link-metadata";
import { prisma } from "@/lib/prisma";
import { generateUniqueShortCode } from "@/lib/short-code";
import { isValidUrl, normalizeShortCode } from "@/lib/validators";

export async function GET() {
  const links = await prisma.link.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { clickLogs: true },
      },
    },
  });

  return Response.json({ ok: true, data: links });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = String(body.title || "").trim();
    const primaryUrl = String(body.primaryUrl || "").trim();
    const fallbackUrl = String(body.fallbackUrl || "").trim();
    const note = serializeLinkMetadata({
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
    let shortCode = body.shortCode ? normalizeShortCode(String(body.shortCode)) : "";

    if (!title) {
      return Response.json({ ok: false, error: { code: "TITLE_REQUIRED", message: "กรอก title" } }, { status: 400 });
    }

    if (!primaryUrl || !isValidUrl(primaryUrl)) {
      return Response.json({ ok: false, error: { code: "PRIMARY_URL_INVALID", message: "primaryUrl ไม่ถูกต้อง" } }, { status: 400 });
    }

    if (!fallbackUrl || !isValidUrl(fallbackUrl)) {
      return Response.json({ ok: false, error: { code: "FALLBACK_URL_INVALID", message: "fallbackUrl ไม่ถูกต้อง" } }, { status: 400 });
    }

    if (!shortCode) {
      shortCode = await generateUniqueShortCode();
    } else {
      const existing = await prisma.link.findUnique({ where: { shortCode }, select: { id: true } });
      if (existing) {
        return Response.json({ ok: false, error: { code: "SHORT_CODE_EXISTS", message: "shortCode นี้ถูกใช้แล้ว" } }, { status: 409 });
      }
    }

    const link = await prisma.link.create({
      data: {
        title,
        shortCode,
        primaryUrl,
        fallbackUrl,
        note,
      },
    });

    return Response.json({ ok: true, data: link }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "ระบบมีปัญหา" } }, { status: 500 });
  }
}
