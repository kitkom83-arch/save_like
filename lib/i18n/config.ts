export const locales = ["th", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "th";
export const localeCookieName = "shortener_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return Boolean(value) && locales.includes(value as Locale);
}

export function getLocaleDateFormat(locale: Locale) {
  return locale === "th" ? "th-TH" : "en-US";
}

export function localizePath(path: string, locale: Locale) {
  if (!path.startsWith("/")) {
    return `/${locale}/${path}`;
  }

  if (path === "/") {
    return `/${locale}`;
  }

  const parts = path.split("/").filter(Boolean);
  if (parts.length > 0 && isLocale(parts[0])) {
    parts[0] = locale;
    return `/${parts.join("/")}`;
  }

  return `/${locale}${path}`;
}
