"use client";

import { createContext, useContext } from "react";
import { defaultLocale, localizePath, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { getDictionary, translate } from "@/lib/i18n/messages";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
};

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  messages: getDictionary(defaultLocale),
});

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  return {
    locale: context.locale,
    t: (key: string, fallback?: string, params?: Record<string, string | number>) =>
      translate(context.messages, key, fallback, params),
    localize: (path: string) => localizePath(path, context.locale),
  };
}
