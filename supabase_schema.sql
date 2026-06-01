-- Supabase Schema for Material Management System

-- 1. Raw Materials Master
CREATE TABLE raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    hsn_code TEXT,
    color_code TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Inventory In (Intake Records)
CREATE TABLE inventory_in (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    quantity_received NUMERIC NOT NULL,
    vendor_name TEXT NOT NULL,
    po_reference TEXT,
    price_per_kg NUMERIC NOT NULL,
    gst_percent NUMERIC NOT NULL,
    base_amount NUMERIC NOT NULL,
    gst_amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    date_received DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Batches (Raw Material Stock)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT NOT NULL,
    serial_number TEXT UNIQUE NOT NULL,
    inventory_in_id UUID REFERENCES inventory_in(id) ON DELETE CASCADE,
    material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    batch_number INTEGER NOT NULL,
    original_quantity NUMERIC NOT NULL,
    available_quantity NUMERIC NOT NULL,
    vendor_name TEXT NOT NULL,
    po_reference TEXT,
    price_per_kg NUMERIC NOT NULL,
    gst_percent NUMERIC NOT NULL,
    batch_value NUMERIC NOT NULL,
    barcode_data TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Active', 'Low Stock', 'Completed', 'Depleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Production Batches
CREATE TABLE production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_batch_id TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    total_units INTEGER NOT NULL,
    batch_type TEXT NOT NULL,
    produced_by TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('Prep', 'In Progress', 'Complete', 'Saved')),
    total_micro_batches INTEGER NOT NULL,
    completed_micro_batches INTEGER NOT NULL DEFAULT 0,
    produced_units INTEGER NOT NULL DEFAULT 0,
    inventory_units INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Production Micro Batches
CREATE TABLE production_micro_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_batch_id TEXT REFERENCES production_batches(production_batch_id) ON DELETE CASCADE,
    micro_batch_no INTEGER NOT NULL,
    units INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Waiting', 'In Progress', 'Passed', 'Failed')),
    barcode_data TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    scanned_into_inventory_at TIMESTAMP WITH TIME ZONE
);

-- 6. Production Ingredients
CREATE TABLE production_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_batch_id TEXT REFERENCES production_batches(production_batch_id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    required_quantity NUMERIC NOT NULL,
    available_quantity_at_start NUMERIC NOT NULL,
    scanned_quantity NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Ready'))
);

-- 7. Raw Material Issues (Consumption)
CREATE TABLE raw_material_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_batch_id TEXT REFERENCES production_batches(production_batch_id) ON DELETE CASCADE,
    raw_material_batch_id TEXT NOT NULL,
    material_name TEXT NOT NULL,
    quantity_issued NUMERIC NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Finished Goods Inventory
CREATE TABLE finished_goods_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_batch_id TEXT REFERENCES production_batches(production_batch_id) ON DELETE CASCADE,
    micro_batch_id UUID REFERENCES production_micro_batches(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    units INTEGER NOT NULL,
    barcode_data TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('In Stock', 'Shipped')),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

-- Enable RLS on all tables
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_micro_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_goods_inventory ENABLE ROW LEVEL SECURITY;

-- Simple Development Policies: Allow Anonymous CRUD
CREATE POLICY "Allow public select" ON raw_materials FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON raw_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON raw_materials FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON raw_materials FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON inventory_in FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON inventory_in FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON inventory_in FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON inventory_in FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON batches FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON batches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON batches FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON batches FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON production_batches FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON production_batches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON production_batches FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON production_batches FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON production_micro_batches FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON production_micro_batches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON production_micro_batches FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON production_micro_batches FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON production_ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON production_ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON production_ingredients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON production_ingredients FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON raw_material_issues FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON raw_material_issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON raw_material_issues FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON raw_material_issues FOR DELETE USING (true);

CREATE POLICY "Allow public select" ON finished_goods_inventory FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON finished_goods_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON finished_goods_inventory FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON finished_goods_inventory FOR DELETE USING (true);

-- ==================================================
-- MIGRATION: ADD SCAN TO INVENTORY FIELDS
-- ==================================================
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS inventory_room_saved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS barcode_status TEXT DEFAULT 'Barcode Saved';
