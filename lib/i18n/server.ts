import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookieName, localizePath, type Locale } from "@/lib/i18n/config";
import { getDictionary, translate } from "@/lib/i18n/messages";

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get(localeCookieName)?.value;

    if (isLocale(locale)) {
      return locale;
    }
  } catch {
    return defaultLocale;
  }

  return defaultLocale;
}

export async function getServerI18n() {
  const locale = await getServerLocale();
  const messages = getDictionary(locale);

  return {
    locale,
    messages,
    t: (key: string, fallback?: string, params?: Record<string, string | number>) =>
      translate(messages, key, fallback, params),
    localize: (path: string) => localizePath(path, locale),
  };
}
