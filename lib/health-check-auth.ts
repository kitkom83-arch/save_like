export function isAuthorizedHealthCheckRequest(request: Request) {
  const secret = process.env.HEALTH_CHECK_SECRET;

  if (!secret) {
    return {
      ok: false,
      code: "HEALTH_CHECK_SECRET_MISSING",
      message: "ยังไม่ได้ตั้งค่า HEALTH_CHECK_SECRET",
      status: 500,
    };
  }

  const requestUrl = new URL(request.url);
  const providedSecret =
    request.headers.get("x-health-check-secret") ||
    requestUrl.searchParams.get("secret");

  if (providedSecret === secret) {
    return { ok: true as const };
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (host) {
    const sameOrigin = origin === `http://${host}` || origin === `https://${host}`;
    const sameReferer = referer?.startsWith(`http://${host}`) || referer?.startsWith(`https://${host}`);

    if (sameOrigin || sameReferer) {
      return { ok: true as const };
    }
  }

  return {
    ok: false,
    code: "UNAUTHORIZED",
    message: "secret ไม่ถูกต้อง",
    status: 401,
  };
}
