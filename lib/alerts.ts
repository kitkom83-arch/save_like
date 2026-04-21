type BrokenAlertPayload = {
  shortCode: string;
  title: string;
  primaryUrl: string;
  fallbackUrl: string;
  status: string;
  checkedAt: string;
  reason?: string;
};

type FallbackUsageAlertPayload = {
  shortCode: string;
  title: string;
  primaryUrl: string;
  fallbackUrl: string;
  status: string;
  checkedAt: string;
  reason?: string;
  clickCount: number;
};

async function postAlert(type: string, payload: BrokenAlertPayload | FallbackUsageAlertPayload) {
  const serialized = JSON.stringify({ type, ...payload });
  console.warn(`[alert:${type}] ${serialized}`);

  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: serialized,
    });
  } catch (error) {
    console.error("[alert:webhook] failed", error);
  }
}

export async function sendBrokenAlert(payload: BrokenAlertPayload) {
  await postAlert("broken", payload);
}

export async function sendFallbackUsageAlert(payload: FallbackUsageAlertPayload) {
  await postAlert("fallback-usage", payload);
}
