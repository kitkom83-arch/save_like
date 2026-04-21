export const LINK_STATUSES = ["healthy", "paused", "broken"] as const;

export type LinkStatus = (typeof LINK_STATUSES)[number];

export function isLinkStatus(value: unknown): value is LinkStatus {
  return typeof value === "string" && LINK_STATUSES.includes(value as LinkStatus);
}
