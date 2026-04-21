type IpEnrichment = {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyRadiusKm: number | null;
  isp: string | null;
  organization: string | null;
  asn: string | null;
  isProxyOrVpn: boolean | null;
};

const ipEnrichmentCache = new Map<string, IpEnrichment | null>();

function getTimeoutMs() {
  const parsed = Number(process.env.IP_GEO_TIMEOUT_MS || "1500");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1500;
}

function getProvider() {
  return process.env.IP_GEO_PROVIDER || "disabled";
}

function isPrivateIp(ipAddress: string) {
  return /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\.|^::1$|^fc00:|^fe80:/i.test(ipAddress);
}

function getProviderUrl(provider: string, ipAddress: string) {
  const apiKey = process.env.IP_GEO_API_KEY;

  switch (provider) {
    case "ipapi":
      return apiKey
        ? `https://api.ipapi.com/${ipAddress}?access_key=${encodeURIComponent(apiKey)}`
        : `https://ipapi.co/${ipAddress}/json/`;
    case "ipinfo":
      return apiKey
        ? `https://ipinfo.io/${ipAddress}?token=${encodeURIComponent(apiKey)}`
        : `https://ipinfo.io/${ipAddress}/json`;
    default:
      return null;
  }
}

function normalizeIpData(provider: string, payload: Record<string, unknown>): IpEnrichment {
  if (provider === "ipinfo") {
    const loc = typeof payload.loc === "string" ? payload.loc.split(",") : [];
    return {
      country: typeof payload.country === "string" ? payload.country : null,
      region: typeof payload.region === "string" ? payload.region : null,
      city: typeof payload.city === "string" ? payload.city : null,
      timezone: typeof payload.timezone === "string" ? payload.timezone : null,
      latitude: loc[0] ? Number(loc[0]) : null,
      longitude: loc[1] ? Number(loc[1]) : null,
      accuracyRadiusKm: null,
      isp: typeof payload.org === "string" ? payload.org : null,
      organization: typeof payload.org === "string" ? payload.org : null,
      asn: typeof payload.org === "string" ? payload.org.split(" ")[0] || null : null,
      isProxyOrVpn: null,
    };
  }

  return {
    country: typeof payload.country_name === "string" ? payload.country_name : typeof payload.country === "string" ? payload.country : null,
    region: typeof payload.region === "string" ? payload.region : null,
    city: typeof payload.city === "string" ? payload.city : null,
    timezone:
      typeof payload.timezone === "string"
        ? payload.timezone
        : typeof payload.time_zone === "object" && payload.time_zone && "name" in payload.time_zone
          ? String((payload.time_zone as { name?: string }).name || "")
          : null,
    latitude: typeof payload.latitude === "number" ? payload.latitude : null,
    longitude: typeof payload.longitude === "number" ? payload.longitude : null,
    accuracyRadiusKm: null,
    isp: typeof payload.org === "string" ? payload.org : null,
    organization: typeof payload.org === "string" ? payload.org : null,
    asn: typeof payload.asn === "string" ? payload.asn : null,
    isProxyOrVpn: typeof payload.security === "object" && payload.security && "is_proxy" in payload.security
      ? Boolean((payload.security as { is_proxy?: boolean }).is_proxy)
      : null,
  };
}

export async function enrichIpAddress(ipAddress: string | null): Promise<IpEnrichment | null> {
  if (!ipAddress || isPrivateIp(ipAddress)) {
    return null;
  }

  if (ipEnrichmentCache.has(ipAddress)) {
    return ipEnrichmentCache.get(ipAddress) || null;
  }

  const provider = getProvider();
  if (provider === "disabled" || provider === "local" || provider === "maxmind" || provider === "ipdata") {
    ipEnrichmentCache.set(ipAddress, null);
    return null;
  }

  const providerUrl = getProviderUrl(provider, ipAddress);
  if (!providerUrl) {
    ipEnrichmentCache.set(ipAddress, null);
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(providerUrl, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      ipEnrichmentCache.set(ipAddress, null);
      return null;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const normalized = normalizeIpData(provider, payload);
    ipEnrichmentCache.set(ipAddress, normalized);
    return normalized;
  } catch {
    ipEnrichmentCache.set(ipAddress, null);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
