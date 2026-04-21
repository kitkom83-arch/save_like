type RequestMetadata = {
  ipAddress: string | null;
  browser: string;
  browserVersion: string | null;
  os: string;
  osVersion: string | null;
  deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  deviceVendor: string;
  deviceModel: string;
  language: string | null;
  referer: string | null;
  userAgent: string | null;
  isBot: boolean;
};

function getHeader(headers: Headers, key: string) {
  return headers.get(key);
}

function getIpAddress(headers: Headers) {
  const forwardedFor = getHeader(headers, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return getHeader(headers, "x-real-ip") || getHeader(headers, "cf-connecting-ip") || null;
}

function parseLanguage(headers: Headers) {
  const acceptLanguage = getHeader(headers, "accept-language");
  if (!acceptLanguage) {
    return null;
  }

  return acceptLanguage.split(",")[0]?.trim() || null;
}

function parseBrowser(userAgent: string) {
  const patterns = [
    { name: "Edge", regex: /edg\/([\d.]+)/i },
    { name: "Chrome", regex: /chrome\/([\d.]+)/i },
    { name: "Firefox", regex: /firefox\/([\d.]+)/i },
    { name: "Safari", regex: /version\/([\d.]+).*safari/i },
    { name: "Samsung Internet", regex: /samsungbrowser\/([\d.]+)/i },
  ];

  for (const pattern of patterns) {
    const match = userAgent.match(pattern.regex);
    if (match) {
      return { browser: pattern.name, version: match[1] || null };
    }
  }

  return { browser: "unknown", version: null };
}

function parseOs(userAgent: string) {
  const patterns = [
    { name: "Windows", regex: /windows nt ([\d.]+)/i },
    { name: "Android", regex: /android ([\d.]+)/i },
    { name: "iOS", regex: /os ([\d_]+) like mac os x/i, transform: (value: string) => value.replace(/_/g, ".") },
    { name: "macOS", regex: /mac os x ([\d_]+)/i, transform: (value: string) => value.replace(/_/g, ".") },
    { name: "Linux", regex: /linux/i },
  ];

  for (const pattern of patterns) {
    const match = userAgent.match(pattern.regex);
    if (match) {
      return {
        os: pattern.name,
        version: pattern.transform ? pattern.transform(match[1] || "") : match[1] || null,
      };
    }
  }

  return { os: "unknown", version: null };
}

function detectBot(userAgent: string) {
  return /bot|crawler|spider|slurp|bingpreview|headless/i.test(userAgent);
}

function parseDevice(userAgent: string) {
  if (detectBot(userAgent)) {
    return {
      deviceType: "bot" as const,
      vendor: "unknown",
      model: "not reliably detected",
    };
  }

  if (/ipad|tablet/i.test(userAgent)) {
    return {
      deviceType: "tablet" as const,
      vendor: /ipad/i.test(userAgent) ? "Apple" : "unknown",
      model: /ipad/i.test(userAgent) ? "iPad" : "unknown",
    };
  }

  if (/iphone/i.test(userAgent)) {
    return {
      deviceType: "mobile" as const,
      vendor: "Apple",
      model: "iPhone",
    };
  }

  if (/pixel/i.test(userAgent)) {
    return {
      deviceType: "mobile" as const,
      vendor: "Google",
      model: "Pixel",
    };
  }

  if (/samsung/i.test(userAgent)) {
    return {
      deviceType: "mobile" as const,
      vendor: "Samsung",
      model: "Galaxy",
    };
  }

  if (/android/i.test(userAgent)) {
    return {
      deviceType: "mobile" as const,
      vendor: "Android",
      model: "unknown",
    };
  }

  if (/mobile/i.test(userAgent)) {
    return {
      deviceType: "mobile" as const,
      vendor: "unknown",
      model: "unknown",
    };
  }

  if (/windows|macintosh|linux|x11/i.test(userAgent)) {
    return {
      deviceType: "desktop" as const,
      vendor: "unknown",
      model: "not reliably detected",
    };
  }

  return {
    deviceType: "unknown" as const,
    vendor: "unknown",
    model: "unknown",
  };
}

export function parseRequestMetadata(input: Request | Headers): RequestMetadata {
  const headers = input instanceof Headers ? input : input.headers;
  const userAgent = getHeader(headers, "user-agent");

  if (!userAgent) {
    return {
      ipAddress: getIpAddress(headers),
      browser: "unknown",
      browserVersion: null,
      os: "unknown",
      osVersion: null,
      deviceType: "unknown",
      deviceVendor: "unknown",
      deviceModel: "unknown",
      language: parseLanguage(headers),
      referer: getHeader(headers, "referer"),
      userAgent: null,
      isBot: false,
    };
  }

  const browser = parseBrowser(userAgent);
  const os = parseOs(userAgent);
  const device = parseDevice(userAgent);

  return {
    ipAddress: getIpAddress(headers),
    browser: browser.browser,
    browserVersion: browser.version,
    os: os.os,
    osVersion: os.version,
    deviceType: device.deviceType,
    deviceVendor: device.vendor,
    deviceModel: device.model,
    language: parseLanguage(headers),
    referer: getHeader(headers, "referer"),
    userAgent,
    isBot: detectBot(userAgent),
  };
}
