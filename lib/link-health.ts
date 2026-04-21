const HEALTH_CHECK_TIMEOUT_MS = 5000;
const BODY_FAILURE_PATTERNS = [
  "user not found",
  "not found",
  "ไม่พบผู้ใช้",
  "ไม่พบเพจ",
  "page not found",
  "account suspended",
] as const;

export type LinkHealthResult = {
  ok: boolean;
  reason?: string;
  httpStatus?: number;
};

async function fetchWithTimeout(url: string, method: "HEAD" | "GET") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "shortener-starter-health-check",
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getFailureReason(status: number) {
  if (status >= 500) {
    return "ปลายทางตอบกลับ 5xx";
  }

  if (status >= 400) {
    return "ปลายทางตอบกลับ 4xx";
  }

  return "ปลายทางไม่พร้อมใช้งาน";
}

function bodyIndicatesFailure(body: string) {
  const normalized = body.toLowerCase();
  return BODY_FAILURE_PATTERNS.find((pattern) => normalized.includes(pattern));
}

export async function checkLinkHealth(url: string): Promise<LinkHealthResult> {
  try {
    const headResponse = await fetchWithTimeout(url, "HEAD");
    const headStatus = headResponse.status;
    const contentType = headResponse.headers.get("content-type") || "";
    const shouldFallbackToGet =
      headStatus === 405 ||
      headStatus === 501 ||
      contentType.includes("text/html") ||
      contentType.includes("application/json") ||
      contentType === "";

    if (!shouldFallbackToGet) {
      if (!headResponse.ok) {
        return {
          ok: false,
          reason: getFailureReason(headStatus),
          httpStatus: headStatus,
        };
      }

      return {
        ok: true,
        httpStatus: headStatus,
      };
    }

    const getResponse = await fetchWithTimeout(url, "GET");

    if (!getResponse.ok) {
      return {
        ok: false,
        reason: getFailureReason(getResponse.status),
        httpStatus: getResponse.status,
      };
    }

    const responseText = await getResponse.text();
    const failurePattern = bodyIndicatesFailure(responseText.slice(0, 4000));

    if (failurePattern) {
      return {
        ok: false,
        reason: `พบข้อความผิดปกติ: ${failurePattern}`,
        httpStatus: getResponse.status,
      };
    }

    return {
      ok: true,
      httpStatus: getResponse.status,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        reason: "health check timeout",
      };
    }

    return {
      ok: false,
      reason: "network error",
    };
  }
}
