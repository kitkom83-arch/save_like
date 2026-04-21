import { enrichIpAddress } from "@/lib/ip-enrichment";
import { maskIpForDisplay } from "@/lib/ip-mask";
import { getPrivacyConfig } from "@/lib/privacy-config";
import { parseRequestMetadata } from "@/lib/request-metadata";

type ClickLogRecord = {
  id: string;
  shortCode: string;
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
  country: string | null;
  deviceType: string | null;
  clickedAt: Date;
};

export type EnrichedClickLog = ClickLogRecord & {
  browser: string;
  browserVersion: string | null;
  os: string;
  osVersion: string | null;
  deviceTypeResolved: string;
  deviceVendor: string;
  deviceModel: string;
  language: string | null;
  isBot: boolean;
  approximateCountry: string | null;
  approximateRegion: string | null;
  approximateCity: string | null;
  approximateTimezone: string | null;
  isp: string | null;
  organization: string | null;
  asn: string | null;
  isProxyOrVpn: boolean | null;
  displayIp: string | null;
};

type CountItem = {
  label: string;
  count: number;
};

export type ClickAnalytics = {
  enrichedLogs: EnrichedClickLog[];
  topCountries: CountItem[];
  topCities: CountItem[];
  topBrowsers: CountItem[];
  topOs: CountItem[];
  topDevices: CountItem[];
  topReferrers: CountItem[];
  botVsHuman: CountItem[];
};

function countTop(values: Array<string | null | undefined>, limit = 5) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = value && value.trim() ? value.trim() : "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export async function buildClickAnalytics(logs: ClickLogRecord[]): Promise<ClickAnalytics> {
  const privacy = getPrivacyConfig();
  const enrichedLogs = await Promise.all(
    logs.map(async (log) => {
      const parsed = parseRequestMetadata(
        new Headers({
          "user-agent": log.userAgent || "",
          referer: log.referer || "",
        })
      );
      const geo =
        privacy.enableIpEnrichment && !privacy.requireConsentForEnrichment
          ? await enrichIpAddress(log.ipAddress)
          : null;

      return {
        ...log,
        browser: parsed.browser,
        browserVersion: parsed.browserVersion,
        os: parsed.os,
        osVersion: parsed.osVersion,
        deviceTypeResolved: log.deviceType || parsed.deviceType,
        deviceVendor: parsed.deviceVendor,
        deviceModel: parsed.deviceModel,
        language: parsed.language,
        isBot: parsed.isBot,
        approximateCountry: log.country || geo?.country || null,
        approximateRegion: geo?.region || null,
        approximateCity: geo?.city || null,
        approximateTimezone: geo?.timezone || null,
        isp: geo?.isp || null,
        organization: geo?.organization || null,
        asn: geo?.asn || null,
        isProxyOrVpn: geo?.isProxyOrVpn ?? null,
        displayIp: privacy.maskIp ? maskIpForDisplay(log.ipAddress) : log.ipAddress,
      };
    })
  );

  return {
    enrichedLogs,
    topCountries: countTop(enrichedLogs.map((log) => log.approximateCountry)),
    topCities: countTop(enrichedLogs.map((log) => log.approximateCity)),
    topBrowsers: countTop(enrichedLogs.map((log) => log.browser)),
    topOs: countTop(enrichedLogs.map((log) => log.os)),
    topDevices: countTop(enrichedLogs.map((log) => log.deviceTypeResolved)),
    topReferrers: countTop(enrichedLogs.map((log) => log.referer)),
    botVsHuman: countTop(enrichedLogs.map((log) => (log.isBot ? "bot" : "human"))),
  };
}
