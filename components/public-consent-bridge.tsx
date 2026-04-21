"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { ConsentCategory } from "@/lib/link-metadata";
import {
  defaultPublicConsentState,
  makeConsentCookieName,
  makeConsentStorageKey,
  makeExactLocationStorageKey,
  parsePublicConsentValue,
  serializePublicConsentValue,
  type PublicConsentState,
} from "@/lib/consent";

type PublicConsentBridgeProps = {
  shortCode: string;
  title: string;
  requestedCategories: ConsentCategory[];
  presetTitle: string;
  presetMessage: string;
  redirectAfterReject: "continue_minimal" | "go_to_fallback" | "go_to_primary_without_optional_features";
  exactLocationEnabled: boolean;
  fingerprintingEnabled: boolean;
  fallbackUrl: string;
  primaryUrl: string;
};

export default function PublicConsentBridge(props: PublicConsentBridgeProps) {
  const { t, localize } = useI18n();
  const requestedCategories = props.requestedCategories ?? [];
  const storageKey = makeConsentStorageKey(props.shortCode);
  const exactLocationStorageKey = makeExactLocationStorageKey(props.shortCode);
  const cookieName = makeConsentCookieName(props.shortCode);
  const [customize, setCustomize] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [consent, setConsent] = useState<PublicConsentState>(defaultPublicConsentState);
  const requestedSet = useMemo(() => new Set(requestedCategories), [requestedCategories]);

  useEffect(() => {
    setConsent(parsePublicConsentValue(window.localStorage.getItem(storageKey)));
  }, [storageKey]);

  function saveConsent(nextConsent: PublicConsentState) {
    const serialized = serializePublicConsentValue(nextConsent);
    window.localStorage.setItem(storageKey, serialized);
    document.cookie = `${cookieName}=${encodeURIComponent(serialized)}; Path=/; Max-Age=2592000; SameSite=Lax`;
    setConsent(nextConsent);
  }

  async function maybeCaptureExactLocation(nextConsent: PublicConsentState) {
    if (
      !requestedSet.has("exactLocation") ||
      nextConsent.exactLocation !== "accepted" ||
      !props.exactLocationEnabled
    ) {
      window.localStorage.removeItem(exactLocationStorageKey);
      return;
    }

    if (!("geolocation" in navigator)) {
      setMessage(t("consent.geoUnsupported", "This device does not support exact location, but you can continue normally."));
      return;
    }

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            latitude: Number(position.coords.latitude.toFixed(5)),
            longitude: Number(position.coords.longitude.toFixed(5)),
            capturedAt: new Date().toISOString(),
          };
          window.localStorage.setItem(exactLocationStorageKey, JSON.stringify(nextLocation));
          resolve();
        },
        () => {
          setMessage(t("consent.geoDenied", "Exact location was not granted. Continuing with minimal mode."));
          resolve();
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 },
      );
    });
  }

  async function continueWith(nextConsent: PublicConsentState, rejectFlow = false) {
    saveConsent(nextConsent);
    await maybeCaptureExactLocation(nextConsent);

    const continueUrl = new URL(localize(`/bridge/${props.shortCode}/continue`), window.location.origin);
    if (rejectFlow && props.redirectAfterReject === "go_to_fallback") {
      continueUrl.searchParams.set("forceFallback", "1");
    }

    window.location.href = continueUrl.toString();
  }

  function acceptAll() {
    const nextConsent = { ...defaultPublicConsentState };
    for (const category of requestedCategories) {
      if (category === "fingerprinting" && !props.fingerprintingEnabled) {
        nextConsent[category] = "rejected";
        continue;
      }

      if (category === "exactLocation" && !props.exactLocationEnabled) {
        nextConsent[category] = "rejected";
        continue;
      }

      nextConsent[category] = "accepted";
    }

    void continueWith(nextConsent);
  }

  function rejectAll() {
    const nextConsent = { ...defaultPublicConsentState };
    for (const category of requestedCategories) {
      nextConsent[category] = "rejected";
    }

    void continueWith(nextConsent, true);
  }

  function updateCustom(category: ConsentCategory, accepted: boolean) {
    setConsent((current) => ({
      ...current,
      [category]: accepted ? "accepted" : "rejected",
    }));
  }

  return (
    <div className="card grid bridge-panel">
      <div className="section-head">
        <h1 style={{ marginBottom: 8 }}>{props.presetTitle}</h1>
        <p className="small" style={{ marginBottom: 8 }}>
          {t("consent.openingLinkFor", "You are opening the link for \"{{title}}\"", { title: props.title })}
        </p>
        <p>{props.presetMessage}</p>
        <p className="small">
          {t("consent.bridgeDescription", "Link /{{shortCode}} can continue with minimal mode even if you decline optional categories.", {
            shortCode: props.shortCode,
          })}
        </p>
      </div>

      {requestedCategories.length > 0 ? (
        <div className="grid grid-2">
          {requestedCategories.map((category) => (
            <div key={category} className="card form-section">
              <p className="small">{t(`consent.categoriesLabel.${category}`, category)}</p>
              <div>
                {category === "exactLocation"
                  ? t("consent.categoryDescriptions.exactLocation", "Exact location is requested from your browser only after explicit consent.")
                  : category === "fingerprinting"
                    ? t("consent.categoryDescriptions.fingerprinting", "Fingerprint-like device details are used only when explicitly accepted.")
                    : t("consent.categoryDescriptions.default", "You can accept or reject this category.")}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="small">{t("consent.noExtraData", "This link does not request extra device data.")}</div>
      )}

      {customize ? (
        <div className="form-section grid">
          {requestedCategories.map((category) => (
            <label key={category} className="inline-checkbox small">
              <input
                type="checkbox"
                checked={consent[category] === "accepted"}
                onChange={(event) => updateCustom(category, event.target.checked)}
              />
              <span>{t(`consent.categoriesLabel.${category}`, category)}</span>
            </label>
          ))}
          <button type="button" onClick={() => void continueWith(consent)}>
            {t("consent.continue", "Continue")}
          </button>
        </div>
      ) : null}

      <div className="action-bar">
        <button type="button" onClick={acceptAll}>
          {t("consent.acceptAll", "Accept All")}
        </button>
        <button type="button" className="secondary" onClick={rejectAll}>
          {t("consent.rejectAll", "Reject All")}
        </button>
        <button type="button" className="secondary" onClick={() => setCustomize((current) => !current)}>
          {customize
            ? t("consent.hideCustomize", "Hide Customize")
            : t("consent.customize", "Customize")}
        </button>
      </div>

      <div className="small form-section">
        <div>{t("consent.primaryDestination", "Primary destination")}: <span className="code">{props.primaryUrl}</span></div>
        <div>{t("consent.fallbackDestination", "Fallback destination")}: <span className="code">{props.fallbackUrl}</span></div>
      </div>

      {message ? <p className="small">{message}</p> : null}
    </div>
  );
}
