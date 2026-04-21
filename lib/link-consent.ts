import type { ConsentCategory, ConsentMode, ConsentPreset, LinkMetadata } from "@/lib/link-metadata";
import { CONSENT_CATEGORIES } from "@/lib/link-metadata";
import type { PrivacyMode } from "@/lib/privacy-config";

export const consentPresetKeys: ConsentPreset[] = [
  "basic_analytics",
  "location_personalization",
  "campaign_measurement",
  "custom",
];

export function getDefaultConsentCategories(mode: ConsentMode, preset: ConsentPreset): ConsentCategory[] {
  if (mode === "normal") {
    return [];
  }

  if (preset === "location_personalization") {
    return ["exactLocation"];
  }

  if (preset === "campaign_measurement") {
    return ["analytics", "marketing"];
  }

  return ["analytics"];
}

export function getRequestedConsentCategories(
  metadata: LinkMetadata,
  privacyMode: PrivacyMode,
  options?: { enableExactLocation?: boolean; enableFingerprinting?: boolean },
) {
  const requested =
    metadata.consentMode === "custom"
      ? metadata.consentCategories
      : getDefaultConsentCategories(metadata.consentMode, metadata.consentPreset);

  return requested.filter((category) => {
    if (category === "exactLocation" && options?.enableExactLocation === false) {
      return false;
    }

    if (category === "fingerprinting" && options?.enableFingerprinting === false) {
      return false;
    }

    if (category === "fingerprinting" && privacyMode !== "off") {
      return false;
    }

    return true;
  });
}

export function requiresConsentBridge(metadata: LinkMetadata) {
  return metadata.consentMode === "consent_required" || metadata.consentMode === "custom";
}

export function normalizeConsentCategoriesForForm(value: unknown): ConsentCategory[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ConsentCategory =>
    typeof item === "string" && CONSENT_CATEGORIES.includes(item as ConsentCategory),
  );
}
