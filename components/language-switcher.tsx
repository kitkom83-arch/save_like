"use client";

import { isLocale, localeCookieName, localizePath, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/components/i18n-provider";

export default function LanguageSwitcher() {
  const { locale, t } = useI18n();

  function switchLanguage(nextLocale: Locale) {
    if (typeof window === "undefined") {
      return;
    }

    const pathname = window.location.pathname;
    const parts = pathname.split("/").filter(Boolean);
    let basePath = pathname;

    if (parts.length > 0 && isLocale(parts[0])) {
      const remaining = parts.slice(1).join("/");
      basePath = remaining ? `/${remaining}` : "/";
    }

    const nextPath = localizePath(basePath, nextLocale);
    document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.href = nextPath;
  }

  return (
    <div className="lang-switch">
      <button
        type="button"
        className={locale === "th" ? "secondary active" : "secondary"}
        onClick={() => switchLanguage("th")}
        aria-label={t("app.switchLanguage", "Switch language")}
      >
        {t("app.languageThai", "ไทย")}
      </button>
      <button
        type="button"
        className={locale === "en" ? "secondary active" : "secondary"}
        onClick={() => switchLanguage("en")}
        aria-label={t("app.switchLanguage", "Switch language")}
      >
        {t("app.languageEnglish", "English")}
      </button>
    </div>
  );
}
