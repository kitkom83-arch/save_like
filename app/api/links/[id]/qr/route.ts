import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const link = await prisma.link.findUnique({
      where: { id },
      select: { id: true, shortCode: true },
    });

    if (!link) {
      return Response.json(
        { ok: false, error: { code: "LINK_NOT_FOUND", message: "ไม่พบลิงก์นี้" } },
        { status: 404 }
      );
    }

    const requestUrl = new URL(request.url);
    const shortUrl = `${requestUrl.origin}/${link.shortCode}`;
    const qrUrl = `https://quickchart.io/qr?size=260&margin=2&text=${encodeURIComponent(shortUrl)}`;

    const response = await fetch(qrUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { ok: false, error: { code: "QR_FETCH_FAILED", message: "สร้าง QR code ไม่สำเร็จ" } },
        { status: 502 }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const headers = new Headers({
      "content-type": response.headers.get("content-type") || "image/png",
      "cache-control": "no-store",
    });

    if (requestUrl.searchParams.get("download") === "1") {
      headers.set("content-disposition", `attachment; filename="${link.shortCode}-qr.png"`);
    }

    return new Response(imageBuffer, { headers });
  } catch {
    return Response.json(
      { ok: false, error: { code: "QR_FETCH_FAILED", message: "สร้าง QR code ไม่สำเร็จ" } },
      { status: 502 }
    );
  }
}
