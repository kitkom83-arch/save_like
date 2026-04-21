const LINK_METADATA_PREFIX = "__SHORTENER_META__:";

export const CONSENT_CATEGORIES = [
  "analytics",
  "exactLocation",
  "marketing",
  "deviceDetails",
  "fingerprinting",
] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];
export type ConsentMode = "normal" | "consent_required" | "custom";
export type ConsentPreset =
  | "basic_analytics"
  | "location_personalization"
  | "campaign_measurement"
  | "custom";
export type RedirectAfterConsent = "follow_link_status";
export type RedirectAfterReject =
  | "continue_minimal"
  | "go_to_fallback"
  | "go_to_primary_without_optional_features";

export type LinkMetadata = {
  campaignName: string;
  source: string;
  medium: string;
  noteText: string;
  consentMode: ConsentMode;
  consentCategories: ConsentCategory[];
  consentPreset: ConsentPreset;
  customConsentTitle: string;
  customConsentMessage: string;
  redirectAfterConsent: RedirectAfterConsent;
  redirectAfterReject: RedirectAfterReject;
};

type StoredLinkMetadata = Partial<LinkMetadata> & {
  consentCategories?: string[];
};

export const defaultLinkMetadata: LinkMetadata = {
  campaignName: "",
  source: "",
  medium: "",
  noteText: "",
  consentMode: "normal",
  consentCategories: [],
  consentPreset: "basic_analytics",
  customConsentTitle: "",
  customConsentMessage: "",
  redirectAfterConsent: "follow_link_status",
  redirectAfterReject: "continue_minimal",
};

function normalizeConsentCategories(value: unknown): ConsentCategory[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ConsentCategory =>
    typeof item === "string" && CONSENT_CATEGORIES.includes(item as ConsentCategory),
  );
}

function normalizeConsentMode(value: unknown): ConsentMode {
  return value === "consent_required" || value === "custom" ? value : "normal";
}

function normalizeConsentPreset(value: unknown): ConsentPreset {
  return value === "location_personalization" ||
    value === "campaign_measurement" ||
    value === "custom"
    ? value
    : "basic_analytics";
}

function normalizeRedirectAfterReject(value: unknown): RedirectAfterReject {
  return value === "go_to_fallback" || value === "go_to_primary_without_optional_features"
    ? value
    : "continue_minimal";
}

function normalizeLinkMetadata(metadata: Partial<LinkMetadata>): LinkMetadata {
  return {
    campaignName: String(metadata.campaignName || "").trim(),
    source: String(metadata.source || "").trim(),
    medium: String(metadata.medium || "").trim(),
    noteText: String(metadata.noteText || "").trim(),
    consentMode: normalizeConsentMode(metadata.consentMode),
    consentCategories: normalizeConsentCategories(metadata.consentCategories),
    consentPreset: normalizeConsentPreset(metadata.consentPreset),
    customConsentTitle: String(metadata.customConsentTitle || "").trim(),
    customConsentMessage: String(metadata.customConsentMessage || "").trim(),
    redirectAfterConsent: "follow_link_status",
    redirectAfterReject: normalizeRedirectAfterReject(metadata.redirectAfterReject),
  };
}

function isDefaultConsentConfig(metadata: LinkMetadata) {
  return (
    metadata.consentMode === "normal" &&
    metadata.consentPreset === "basic_analytics" &&
    metadata.consentCategories.length === 0 &&
    !metadata.customConsentTitle &&
    !metadata.customConsentMessage &&
    metadata.redirectAfterConsent === "follow_link_status" &&
    metadata.redirectAfterReject === "continue_minimal"
  );
}

export function parseLinkMetadata(note: string | null | undefined): LinkMetadata {
  if (!note) {
    return defaultLinkMetadata;
  }

  if (!note.startsWith(LINK_METADATA_PREFIX)) {
    return {
      ...defaultLinkMetadata,
      noteText: note,
    };
  }

  try {
    const parsed = JSON.parse(note.slice(LINK_METADATA_PREFIX.length)) as StoredLinkMetadata;
    return normalizeLinkMetadata({
      ...parsed,
      consentCategories: normalizeConsentCategories(parsed.consentCategories),
    });
  } catch {
    return {
      ...defaultLinkMetadata,
      noteText: note,
    };
  }
}

export function serializeLinkMetadata(metadata: Partial<LinkMetadata>) {
  const normalized = normalizeLinkMetadata(metadata);

  if (
    !normalized.campaignName &&
    !normalized.source &&
    !normalized.medium &&
    !normalized.noteText &&
    isDefaultConsentConfig(normalized)
  ) {
    return null;
  }

  if (
    !normalized.campaignName &&
    !normalized.source &&
    !normalized.medium &&
    isDefaultConsentConfig(normalized)
  ) {
    return normalized.noteText || null;
  }

  return `${LINK_METADATA_PREFIX}${JSON.stringify(normalized)}`;
}
