export type PrivacyMode = "strict" | "balanced" | "off";

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue;
  }

  return value === "true";
}

export function getPrivacyConfig() {
  const privacyMode = (process.env.PRIVACY_MODE || "balanced") as PrivacyMode;

  const defaults = {
    strict: {
      maskIp: true,
      storeRawIp: false,
      enableIpEnrichment: false,
      enableExactLocation: false,
      enableFingerprinting: false,
      requireConsentForEnrichment: true,
    },
    balanced: {
      maskIp: true,
      storeRawIp: true,
      enableIpEnrichment: true,
      enableExactLocation: false,
      enableFingerprinting: false,
      requireConsentForEnrichment: false,
    },
    off: {
      maskIp: false,
      storeRawIp: true,
      enableIpEnrichment: true,
      enableExactLocation: true,
      enableFingerprinting: false,
      requireConsentForEnrichment: false,
    },
  }[privacyMode] || {
    maskIp: true,
    storeRawIp: true,
    enableIpEnrichment: true,
    enableExactLocation: false,
    enableFingerprinting: false,
    requireConsentForEnrichment: false,
  };

  return {
    privacyMode,
    maskIp: parseBoolean(process.env.MASK_IP, defaults.maskIp),
    storeRawIp: parseBoolean(process.env.STORE_RAW_IP, defaults.storeRawIp),
    enableIpEnrichment: parseBoolean(process.env.ENABLE_IP_ENRICHMENT, defaults.enableIpEnrichment),
    enableExactLocation: parseBoolean(process.env.ENABLE_EXACT_LOCATION, defaults.enableExactLocation),
    enableFingerprinting: parseBoolean(process.env.ENABLE_FINGERPRINTING, defaults.enableFingerprinting),
    requireConsentForEnrichment: parseBoolean(
      process.env.REQUIRE_CONSENT_FOR_ENRICHMENT,
      defaults.requireConsentForEnrichment
    ),
  };
}
