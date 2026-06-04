export async function sendScanWebhook(payload: any) {
  console.log("Webhook URL:", import.meta.env.VITE_WEBHOOK_URL);
  console.log("Sending webhook:", payload);

  const response = await fetch(
    import.meta.env.VITE_WEBHOOK_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();
  console.log("Webhook response:", result);
  return result;
}
