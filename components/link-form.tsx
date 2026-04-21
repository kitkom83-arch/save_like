"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { consentPresetKeys } from "@/lib/link-consent";
import { CONSENT_CATEGORIES, type ConsentCategory } from "@/lib/link-metadata";
import { parseLinkMetadata } from "@/lib/link-metadata";

type LinkFormProps = {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    title?: string;
    shortCode?: string;
    primaryUrl?: string;
    fallbackUrl?: string;
    status?: "healthy" | "broken" | "paused";
    note?: string | null;
  };
};

export default function LinkForm({ mode, initialData }: LinkFormProps) {
  const { t, localize } = useI18n();
  const metadata = parseLinkMetadata(initialData?.note);
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [shortCode, setShortCode] = useState(initialData?.shortCode || "");
  const [primaryUrl, setPrimaryUrl] = useState(initialData?.primaryUrl || "");
  const [fallbackUrl, setFallbackUrl] = useState(initialData?.fallbackUrl || "");
  const [status, setStatus] = useState(initialData?.status || "healthy");
  const [campaignName, setCampaignName] = useState(metadata.campaignName);
  const [source, setSource] = useState(metadata.source);
  const [medium, setMedium] = useState(metadata.medium);
  const [note, setNote] = useState(metadata.noteText);
  const [consentMode, setConsentMode] = useState(metadata.consentMode);
  const [consentPreset, setConsentPreset] = useState(metadata.consentPreset);
  const [consentCategories, setConsentCategories] = useState<ConsentCategory[]>(metadata.consentCategories);
  const [customConsentTitle, setCustomConsentTitle] = useState(metadata.customConsentTitle);
  const [customConsentMessage, setCustomConsentMessage] = useState(metadata.customConsentMessage);
  const [redirectAfterReject, setRedirectAfterReject] = useState(metadata.redirectAfterReject);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleConsentCategory(category: ConsentCategory) {
    setConsentCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = {
      title,
      shortCode,
      primaryUrl,
      fallbackUrl,
      status,
      campaignName,
      source,
      medium,
      note,
      consentMode,
      consentPreset,
      consentCategories,
      customConsentTitle,
      customConsentMessage,
      redirectAfterConsent: "follow_link_status",
      redirectAfterReject,
    };

    const endpoint = mode === "create" ? "/api/links" : `/api/links/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data?.error?.message || t("common.submitFail", "Save failed"));
      setLoading(false);
      return;
    }

    setMessage(t("common.submitSuccess", "Saved successfully"));
    setLoading(false);

    const targetId = data?.data?.id || initialData?.id;
    if (targetId) {
      router.push(localize(`/dashboard/links/${targetId}`));
    } else {
      router.push(localize("/dashboard/links"));
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card form-grid">
      <section className="form-section">
        <div className="section-head">
          <h3>{t("links.form.sections.basic", "Link Details")}</h3>
        </div>
        <div className="form-grid two-col">
          <div>
            <label>{t("links.form.title", "Display Title")} <span className="small">({t("links.form.required", "Required")})</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("links.form.placeholders.title", "e.g. LINE campaign A")}
            />
          </div>

          <div>
            <label>{t("links.form.shortCode", "Short Code")} <span className="small">({t("links.form.optional", "Optional")})</span></label>
            <input
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              placeholder={t("links.form.placeholders.shortCode", "Leave blank for auto-generate")}
            />
            <p className="field-help">{t("links.form.help.shortCode", "Leave blank to let the system generate a short code.")}</p>
          </div>

          <div>
            <label>{t("links.form.campaignName", "Campaign Name")}</label>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={t("links.form.placeholders.campaignName", "e.g. Songkran Blast 2026")}
            />
          </div>

          <div>
            <label>{t("links.form.source", "Source")}</label>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("links.form.placeholders.source", "e.g. line")}
            />
          </div>

          <div>
            <label>{t("links.form.medium", "Medium")}</label>
            <input
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder={t("links.form.placeholders.medium", "e.g. social")}
            />
          </div>

          {mode === "edit" ? (
            <div>
              <label>{t("links.form.status", "Status")}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as "healthy" | "broken" | "paused") }>
                <option value="healthy">{t("status.healthy", "healthy")}</option>
                <option value="broken">{t("status.broken", "broken")}</option>
                <option value="paused">{t("status.paused", "paused")}</option>
              </select>
            </div>
          ) : null}
        </div>
      </section>

      <section className="form-section">
        <div className="section-head">
          <h3>{t("links.form.sections.destination", "Destinations")}</h3>
        </div>
        <div className="form-grid two-col">
          <div>
            <label>{t("links.form.primaryUrl", "Primary URL")} <span className="small">({t("links.form.required", "Required")})</span></label>
            <input
              value={primaryUrl}
              onChange={(e) => setPrimaryUrl(e.target.value)}
              placeholder={t("links.form.placeholders.primaryUrl", "https://example.com/main")}
            />
          </div>

          <div>
            <label>{t("links.form.fallbackUrl", "Fallback URL")} <span className="small">({t("links.form.required", "Required")})</span></label>
            <input
              value={fallbackUrl}
              onChange={(e) => setFallbackUrl(e.target.value)}
              placeholder={t("links.form.placeholders.fallbackUrl", "https://example.com/fallback")}
            />
            <p className="field-help">{t("links.form.help.fallbackUrl", "Used when the link status is broken.")}</p>
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="section-head">
          <h3>{t("links.form.sections.consent", "Consent Settings")}</h3>
        </div>
        <div className="form-grid two-col">
          <div>
            <label>{t("links.form.consentMode", "Consent Mode")}</label>
            <select value={consentMode} onChange={(e) => setConsentMode(e.target.value as "normal" | "consent_required" | "custom")}>
              <option value="normal">{t("consent.modes.normal", "normal")}</option>
              <option value="consent_required">{t("consent.modes.consent_required", "consent_required")}</option>
              <option value="custom">{t("consent.modes.custom", "custom")}</option>
            </select>
            <p className="field-help">{t("links.form.help.consentMode", "normal: no prompt, consent_required: prompt before continue, custom: choose categories manually.")}</p>
          </div>

          <div>
            <label>{t("links.form.consentPreset", "Consent Preset")}</label>
            <select value={consentPreset} onChange={(e) => setConsentPreset(e.target.value as typeof metadata.consentPreset)}>
              {consentPresetKeys.map((presetKey) => (
                <option key={presetKey} value={presetKey}>
                  {t(`consent.presets.${presetKey}.label`, presetKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label>{t("links.form.categories", "Categories to Request")}</label>
          <div className="grid grid-2">
            {CONSENT_CATEGORIES.map((category) => (
              <label key={category} className="inline-checkbox small">
                <input
                  type="checkbox"
                  checked={consentCategories.includes(category)}
                  onChange={() => toggleConsentCategory(category)}
                />
                <span>{t(`consent.categoriesLabel.${category}`, category)}</span>
              </label>
            ))}
          </div>
          <p className="field-help">{t("links.form.help.categories", "Selected categories are requested only on the public bridge page.")}</p>
        </div>

        <div className="form-grid two-col">
          <div>
            <label>{t("links.form.customTitle", "Custom Consent Title")}</label>
            <input
              value={customConsentTitle}
              onChange={(e) => setCustomConsentTitle(e.target.value)}
              placeholder={t("links.form.placeholders.customTitle", "e.g. Additional consent request")}
            />
          </div>

          <div>
            <label>{t("links.form.customMessage", "Custom Consent Message")}</label>
            <textarea
              value={customConsentMessage}
              onChange={(e) => setCustomConsentMessage(e.target.value)}
              rows={4}
              placeholder={t("links.form.placeholders.customMessage", "Enter custom consent message")}
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="section-head">
          <h3>{t("links.form.sections.redirect", "Decision Behavior")}</h3>
        </div>
        <div className="form-grid two-col">
          <div>
            <label>{t("links.form.redirectAfterConsent", "Redirect After Consent")}</label>
            <select value="follow_link_status" disabled>
              <option value="follow_link_status">follow_link_status</option>
            </select>
          </div>

          <div>
            <label>{t("links.form.redirectAfterReject", "Redirect After Reject")}</label>
            <select
              value={redirectAfterReject}
              onChange={(e) =>
                setRedirectAfterReject(
                  e.target.value as "continue_minimal" | "go_to_fallback" | "go_to_primary_without_optional_features",
                )
              }
            >
              <option value="continue_minimal">{t("consent.rejectBehaviors.continue_minimal", "continue_minimal")}</option>
              <option value="go_to_fallback">{t("consent.rejectBehaviors.go_to_fallback", "go_to_fallback")}</option>
              <option value="go_to_primary_without_optional_features">
                {t("consent.rejectBehaviors.go_to_primary_without_optional_features", "go_to_primary_without_optional_features")}
              </option>
            </select>
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="section-head">
          <h3>{t("links.form.sections.note", "Additional Notes")}</h3>
        </div>
        <div>
          <label>{t("links.form.note", "Note")}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder={t("links.form.placeholders.note", "Additional details")}
          />
        </div>
      </section>

      <button type="submit" disabled={loading}>
        {loading
          ? t("common.loading", "Loading...")
          : mode === "create"
            ? t("links.form.createSubmit", "Create Link")
            : t("links.form.editSubmit", "Save Changes")}
      </button>
      {message ? <p className="small">{message}</p> : null}
    </form>
  );
}
