const adminSessionCookieName = "shortener_admin_session";
const adminSessionMaxAge = 60 * 60 * 12;

type SessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
};

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toHex(signature);
}

export async function createAdminSession(): Promise<SessionCookie> {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is missing");
  }

  const expiresAt = Date.now() + adminSessionMaxAge * 1000;
  const payload = String(expiresAt);
  const signature = await sign(payload, secret);

  return {
    name: adminSessionCookieName,
    value: `${payload}.${signature}`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: adminSessionMaxAge,
    },
  };
}

export async function verifyAdminSession(session: string | undefined | null) {
  if (!session) {
    return false;
  }

  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (!secret) {
    return false;
  }

  const [payload, signature] = session.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const expected = await sign(payload, secret);
  return expected === signature;
}

export function clearAdminSession(): SessionCookie {
  return {
    name: adminSessionCookieName,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    },
  };
}

export { adminSessionCookieName };
