import { isAuthorizedHealthCheckRequest } from "@/lib/health-check-auth";
import { runHealthCheckForAllLinks } from "@/lib/run-health-check";

export async function POST(request: Request) {
  const authorization = isAuthorizedHealthCheckRequest(request);

  if (!authorization.ok) {
    return Response.json(
      {
        ok: false,
        error: {
          code: authorization.code,
          message: authorization.message,
        },
      },
      { status: authorization.status }
    );
  }

  const summary = await runHealthCheckForAllLinks();
  return Response.json({ ok: true, data: summary });
}
