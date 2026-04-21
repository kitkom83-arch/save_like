"use client";

import { useI18n } from "@/components/i18n-provider";
import { getRequestedConsentCategories } from "@/lib/link-consent";
import type { LinkMetadata } from "@/lib/link-metadata";

type ConsentPolicyCardProps = {
  metadata: LinkMetadata;
  privacyMode: "strict" | "balanced" | "off";
  maskIp: boolean;
  enableExactLocation: boolean;
  enableFingerprinting: boolean;
};

export default function ConsentPolicyCard(props: ConsentPolicyCardProps) {
  const { t } = useI18n();
  const resolvedCategories = getRequestedConsentCategories(props.metadata, props.privacyMode, {
    enableExactLocation: props.enableExactLocation,
    enableFingerprinting: props.enableFingerprinting,
  });
  const safeResolvedCategories = resolvedCategories ?? [];
  const presetTitle = props.metadata.customConsentTitle || t(`consent.presets.${props.metadata.consentPreset}.title`, "Consent");
  const presetMessage = props.metadata.customConsentMessage || t(`consent.presets.${props.metadata.consentPreset}.message`, "-");
  const presetLabel = t(`consent.presets.${props.metadata.consentPreset}.label`, props.metadata.consentPreset);

  return (
    <div className="card grid">
      <div className="section-head">
        <h2>{t("consent.policyTitle", "Consent Policy")}</h2>
        <p className="small">{t("consent.policyDescription", "This page configures per-link policy. Visitor consent appears only on the public bridge page.")}</p>
      </div>
      <div className="grid grid-2">
        <div className="form-section">
          <p className="small">{t("consent.mode", "Consent Mode")}</p>
          <div>{t(`consent.modes.${props.metadata.consentMode}`, props.metadata.consentMode)}</div>
        </div>
        <div className="form-section">
          <p className="small">{t("consent.preset", "Consent Preset")}</p>
          <div>{presetLabel}</div>
        </div>
        <div className="form-section">
          <p className="small">{t("consent.categories", "Enabled Categories")}</p>
          <div>
            {safeResolvedCategories.length > 0
              ? safeResolvedCategories.map((category) => t(`consent.categoriesLabel.${category}`, category)).join(", ")
              : t("consent.none", "none")}
          </div>
        </div>
        <div className="form-section">
          <p className="small">{t("consent.rejectBehavior", "Reject Behavior")}</p>
          <div>{t(`consent.rejectBehaviors.${props.metadata.redirectAfterReject}`, props.metadata.redirectAfterReject)}</div>
        </div>
        <div className="form-section">
          <p className="small">{t("privacy.mode", "Privacy Mode")}</p>
          <div>{props.privacyMode}</div>
        </div>
        <div className="form-section">
          <p className="small">{t("privacy.maskIp", "Mask IP")}</p>
          <div>{props.maskIp ? t("privacy.enabled", "enabled") : t("privacy.disabled", "disabled")}</div>
        </div>
        <div className="form-section">
          <p className="small">{t("privacy.exactLocation", "Exact Location")}</p>
          <div>
            {props.enableExactLocation
              ? t("privacy.availableWithConsent", "available with consent")
              : t("privacy.disabled", "disabled")}
          </div>
        </div>
        <div className="form-section">
          <p className="small">{t("privacy.fingerprinting", "Fingerprinting")}</p>
          <div>
            {props.enableFingerprinting
              ? t("privacy.availableWithConsent", "available with consent")
              : t("privacy.disabled", "disabled")}
          </div>
        </div>
      </div>
      <div>
        <p className="small">{t("consent.presetMessage", "Preset Message")}</p>
        <div className="form-section">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{presetTitle}</div>
          <div>{presetMessage}</div>
        </div>
      </div>
    </div>
  );
}
