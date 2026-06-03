CREATE TABLE IF NOT EXISTS webhook_test_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode_no text,
    material_name text,
    batch_no text,
    vendor_name text,
    quantity_kg numeric,
    status text,
    scanned_at timestamptz DEFAULT now(),
    payload jsonb
);
