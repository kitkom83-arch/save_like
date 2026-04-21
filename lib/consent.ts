import type { ConsentCategory } from "@/lib/link-metadata";

export type ConsentDecision = "prompt" | "accepted" | "rejected";

export type PublicConsentState = Record<ConsentCategory, ConsentDecision>;

export const defaultPublicConsentState: PublicConsentState = {
  analytics: "prompt",
  exactLocation: "prompt",
  marketing: "prompt",
  deviceDetails: "prompt",
  fingerprinting: "prompt",
};

export function makeConsentStorageKey(shortCode: string) {
  return `shortener-public-consent:${shortCode}`;
}

export function makeExactLocationStorageKey(shortCode: string) {
  return `shortener-exact-location:${shortCode}`;
}

export function makeConsentCookieName(shortCode: string) {
  return `shortener_link_consent_${shortCode.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function parsePublicConsentValue(value: string | null): PublicConsentState {
  if (!value) {
    return defaultPublicConsentState;
  }

  try {
    const parsed = JSON.parse(value) as Partial<Record<ConsentCategory, ConsentDecision>>;
    return {
      analytics: parsed.analytics === "accepted" || parsed.analytics === "rejected" ? parsed.analytics : "prompt",
      exactLocation:
        parsed.exactLocation === "accepted" || parsed.exactLocation === "rejected"
          ? parsed.exactLocation
          : "prompt",
      marketing: parsed.marketing === "accepted" || parsed.marketing === "rejected" ? parsed.marketing : "prompt",
      deviceDetails:
        parsed.deviceDetails === "accepted" || parsed.deviceDetails === "rejected"
          ? parsed.deviceDetails
          : "prompt",
      fingerprinting:
        parsed.fingerprinting === "accepted" || parsed.fingerprinting === "rejected"
          ? parsed.fingerprinting
          : "prompt",
    };
  } catch {
    return defaultPublicConsentState;
  }
}

export function serializePublicConsentValue(value: PublicConsentState) {
  return JSON.stringify(value);
}
