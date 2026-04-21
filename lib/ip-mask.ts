function maskIpv4(ipAddress: string, revealLast = false) {
  const segments = ipAddress.split(".");
  if (segments.length !== 4) {
    return ipAddress;
  }

  if (revealLast) {
    return `${segments[0]}.${segments[1]}.*.*`;
  }

  return `${segments[0]}.${segments[1]}.${segments[2]}.0`;
}

function maskIpv6(ipAddress: string, revealLast = false) {
  const segments = ipAddress.split(":");
  if (segments.length < 2) {
    return ipAddress;
  }

  if (revealLast) {
    return `${segments.slice(0, 3).join(":")}:*:*:*:*:*`;
  }

  return `${segments.slice(0, 4).join(":")}:*:*:*:*`;
}

export function maskIpForStorage(ipAddress: string | null) {
  if (!ipAddress) {
    return null;
  }

  if (ipAddress.includes(":")) {
    return maskIpv6(ipAddress);
  }

  return maskIpv4(ipAddress);
}

export function maskIpForDisplay(ipAddress: string | null) {
  if (!ipAddress) {
    return null;
  }

  if (ipAddress.includes(":")) {
    return maskIpv6(ipAddress, true);
  }

  return maskIpv4(ipAddress, true);
}
