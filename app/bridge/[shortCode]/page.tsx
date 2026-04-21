import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PublicConsentBridge from "@/components/public-consent-bridge";
import { getRequestedConsentCategories, requiresConsentBridge } from "@/lib/link-consent";
import { getServerI18n } from "@/lib/i18n/server";
import { parseLinkMetadata } from "@/lib/link-metadata";
import { getPrivacyConfig } from "@/lib/privacy-config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BridgePage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const { t, localize } = await getServerI18n();
  const link = await prisma.link.findUnique({
    where: { shortCode },
  });

  if (!link) {
    notFound();
  }

  if (link.status === "paused") {
    redirect(localize(`/paused?code=${encodeURIComponent(shortCode)}`));
  }

  const metadata = parseLinkMetadata(link.note);
  if (!requiresConsentBridge(metadata)) {
    redirect(`/${shortCode}`);
  }

  const privacy = getPrivacyConfig();
  const presetTitle = metadata.customConsentTitle || t(`consent.presets.${metadata.consentPreset}.title`, "Consent");
  const presetMessage = metadata.customConsentMessage || t(`consent.presets.${metadata.consentPreset}.message`, "-");
  const requestedCategories = getRequestedConsentCategories(metadata, privacy.privacyMode, {
    enableExactLocation: privacy.enableExactLocation,
    enableFingerprinting: privacy.enableFingerprinting,
  });

  return (
    <main className="container grid bridge-shell" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="action-bar">
        <Link href={localize("/")}>
          <button type="button" className="secondary">{t("nav.home", "Home")}</button>
        </Link>
      </div>
      <PublicConsentBridge
        shortCode={shortCode}
        title={link.title}
        requestedCategories={requestedCategories}
        presetTitle={presetTitle}
        presetMessage={presetMessage}
        redirectAfterReject={metadata.redirectAfterReject}
        exactLocationEnabled={privacy.enableExactLocation}
        fingerprintingEnabled={privacy.enableFingerprinting}
        fallbackUrl={link.fallbackUrl}
        primaryUrl={link.primaryUrl}
      />
    </main>
  );
}
