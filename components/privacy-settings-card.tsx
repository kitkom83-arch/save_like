"use client";

import { useI18n } from "@/components/i18n-provider";

type PrivacySettingsCardProps = {
  privacyMode: string;
  maskIp: boolean;
  enableExactLocation: boolean;
  enableFingerprinting: boolean;
};

export default function PrivacySettingsCard(props: PrivacySettingsCardProps) {
  const { t } = useI18n();

  return (
    <div className="card grid">
      <div className="section-head">
        <h2>{t("privacy.title", "Privacy Settings")}</h2>
        <p className="small">{t("privacy.description", "IP location is approximate. Exact location can only be requested on the public bridge page.")}</p>
      </div>
      <div className="grid grid-2">
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
    </div>
  );
}
