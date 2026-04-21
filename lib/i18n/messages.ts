import en from "@/messages/en.json";
import th from "@/messages/th.json";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

export type Messages = typeof th;

const dictionaries: Record<Locale, Messages> = {
  th,
  en,
};

export function getDictionary(locale: string | undefined): Messages {
  if (isLocale(locale)) {
    return dictionaries[locale];
  }

  return dictionaries[defaultLocale];
}

function readNestedValue(source: unknown, key: string) {
  if (typeof source !== "object" || source === null) {
    return undefined;
  }

  const parts = key.split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function translate(
  messages: Messages,
  key: string,
  fallback?: string,
  params?: Record<string, string | number>,
) {
  const raw = readNestedValue(messages, key);
  const defaultRaw = readNestedValue(dictionaries[defaultLocale], key);
  const value =
    typeof raw === "string"
      ? raw
      : typeof defaultRaw === "string"
        ? defaultRaw
        : fallback ?? key;

  if (!params) {
    return value;
  }

  return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
    return acc.replaceAll(`{{${paramKey}}}`, String(paramValue));
  }, value);
}
