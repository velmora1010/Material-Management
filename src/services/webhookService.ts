export const sendScanWebhook = async (scannedBatch: any) => {
  const webhookUrl = import.meta.env.VITE_WEBHOOK_URL || "";
  
  if (!webhookUrl) {
    console.log("No VITE_WEBHOOK_URL configured, skipping webhook.");
    return;
  }

  const payload = {
    barcode_no: scannedBatch.serial_number || scannedBatch.batch_id,
    material_name: scannedBatch.material_name,
    batch_no: Number(scannedBatch.batch_no),
    vendor_name: scannedBatch.vendor_name,
    quantity_kg: Number(scannedBatch.quantity || scannedBatch.original_quantity || scannedBatch.available_quantity),
    status: "Stock In",
    scanned_at: new Date().toISOString(),
    payload: scannedBatch
  };

  try {
    console.log("Webhook enabled URL:", import.meta.env.VITE_WEBHOOK_URL);
    console.log("Sending scan webhook payload:", payload);
    
    const response = await fetch(import.meta.env.VITE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    console.log("Webhook response status:", response.status);
    console.log("Webhook response body:", responseText);
    
  } catch (error) {
    console.error("Webhook failed:", error);
  }
};
