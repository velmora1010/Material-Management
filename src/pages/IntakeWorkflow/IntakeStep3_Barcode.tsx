import { useNavigate, Navigate } from 'react-router-dom';
import { useIntakeContext } from './IntakeContext';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, Save } from 'lucide-react';
import db from '../../db/db';

const IntakeStep3_Barcode = () => {
  const navigate = useNavigate();
  const { selectedMaterial, formData, batches, setSavedBatchIds } = useIntakeContext();

  if (!selectedMaterial || batches.length === 0) {
    return <Navigate to="/raw-material/intake" replace />;
  }

  const targetQty = Number(formData.quantity_received) || 0;
  const baseAmount = targetQty * (Number(formData.price_per_kg) || 0);
  const gstAmount = baseAmount * ((Number(formData.gst_percent) || 0) / 100);
  const totalAmount = baseAmount + gstAmount;

  // Generate deterministic serial numbers for this session
  // Format: BRAND-QTY-RANDOM (e.g. SLES-50-7320)
  const productCode = selectedMaterial.name.substring(0, 4).toUpperCase();
  const previewBatches = batches.map(b => {
    // Generate a pseudo-random serial part or use timestamp to ensure uniqueness
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const serialNumber = `${productCode}-${b.quantity}-${randomCode}`;
    return { ...b, serialNumber };
  });

  const handleSaveToStock = async () => {
    const invInId = await db.inventory_in.add({
      material_id: Number(selectedMaterial.id), 
      material_name: selectedMaterial.name,
      quantity_received: targetQty,
      vendor_name: formData.vendor_name, 
      po_reference: formData.po_reference,
      price_per_kg: Number(formData.price_per_kg), 
      gst_percent: Number(formData.gst_percent),
      base_amount: baseAmount, 
      gst_amount: gstAmount, 
      total_amount: totalAmount,
      notes: formData.notes, 
      date_received: formData.date_received || new Date().toISOString(), 
      created_at: new Date().toISOString()
    });

    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');

    const finalBatches = previewBatches.map(b => {
      const batchId = `MAT-${dateStr}-${productCode}-${String(b.batch_no).padStart(3, '0')}`;
      const batchValue = b.quantity * Number(formData.price_per_kg) * (1 + (Number(formData.gst_percent)/100));
      
      const qrDataPayload = JSON.stringify({ 
        serialNumber: b.serialNumber, 
        batchId: batchId, 
        materialId: selectedMaterial.id 
      });

      return {
        batch_id: batchId, 
        serial_number: b.serialNumber,
        inventory_in_id: Number(invInId), 
        material_id: Number(selectedMaterial.id),
        material_name: selectedMaterial.name,
        batch_number: b.batch_no, 
        original_quantity: b.quantity, 
        available_quantity: b.quantity,
        vendor_name: formData.vendor_name, 
        po_reference: formData.po_reference,
        price_per_kg: Number(formData.price_per_kg), 
        gst_percent: Number(formData.gst_percent),
        batch_value: batchValue,
        barcode_data: qrDataPayload,
        status: 'Active' as const, 
        created_at: new Date().toISOString()
      };
    });

    const savedIds = await db.batches.bulkAdd(finalBatches as any, { allKeys: true });
    setSavedBatchIds(savedIds as number[]);
    navigate('/raw-material/confirmation');
  };

  const downloadQR = (serial: string) => {
    const svg = document.getElementById(`qr-${serial}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      const downloadLink = document.createElement('a');
      downloadLink.download = `${serial}.png`;
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleDownloadAll = () => {
    previewBatches.forEach(b => {
      downloadQR(b.serialNumber);
    });
  };

  return (
    <>
      <div className="page-header">
        <h1>Step 3: Generate Barcode / QR Labels</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print All
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadAll}>
            <Download size={16} /> Download All
          </button>
          <button className="btn btn-primary" onClick={handleSaveToStock}>
            <Save size={16} /> Save to Stock
          </button>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '24px' }}>
        {previewBatches.map((b) => (
          <div key={b.id} className="page-card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <QRCodeSVG 
                  id={`qr-${b.serialNumber}`} 
                  value={JSON.stringify({ serialNumber: b.serialNumber, materialName: selectedMaterial.name })} 
                  size={140} 
                />
              </div>
            </div>
            
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
              {selectedMaterial.name}
            </h3>
            
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--primary)', fontFamily: 'monospace', marginBottom: '16px' }}>
              {b.serialNumber}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left', background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px', fontSize: '12px', marginBottom: '20px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Quantity:</span> <br/><b>{b.quantity} KG</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Batch No:</span> <br/><b>{b.batch_no}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Vendor:</span> <br/><b>{formData.vendor_name}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <br/><b>{formData.date_received}</b></div>
            </div>
            
            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '0 8px' }} onClick={() => downloadQR(b.serialNumber)}>
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
          <button className="btn btn-secondary" onClick={() => navigate('/raw-material/split-batches')}>Back</button>
        </div>
        <button className="btn btn-primary" onClick={handleSaveToStock}><Save size={18} /> Save to Stock</button>
      </div>
    </>
  );
};

export default IntakeStep3_Barcode;
