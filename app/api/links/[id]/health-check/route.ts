import { runHealthCheckForLink } from "@/lib/run-health-check";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const summary = await runHealthCheckForLink(id);

  if (!summary) {
    return Response.json(
      { ok: false, error: { code: "LINK_NOT_FOUND", message: "ไม่พบลิงก์นี้" } },
      { status: 404 }
    );
  }

  return Response.json({ ok: true, data: summary });
}
