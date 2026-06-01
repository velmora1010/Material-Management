import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useIntakeContext } from './IntakeContext';
import Barcode from 'react-barcode';
import { Printer, Download, Save, CheckCircle } from 'lucide-react';
import { rawMaterialService } from '../../services/rawMaterialService';
import { supabase } from '../../lib/supabaseClient';

const IntakeStep3_Barcode = () => {
  const navigate = useNavigate();
  const { selectedMaterial, formData, batches, setSavedBatchIds, setFormData, setBatches, setSelectedMaterial } = useIntakeContext();
  const [isSaved, setIsSaved] = useState(false);
  const [showToast, setShowToast] = useState(false);

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

  const handleSaveBarcode = async () => {
    try {
      // Prevent duplicates by checking if serial numbers exist
      const serials = previewBatches.map(b => b.serialNumber);
      const { data: existingBatches } = await supabase.from('batches').select('serial_number').in('serial_number', serials);
      
      const existingSerials = new Set(existingBatches?.map(eb => eb.serial_number) || []);
      
      const newBatches = previewBatches.filter(b => !existingSerials.has(b.serialNumber));
      
      if (newBatches.length > 0) {
        const inventoryInRecord = {
          material_id: selectedMaterial.id, 
          material_name: selectedMaterial.name,
          quantity_received: targetQty,
          vendor_name: formData.vendor_name, 
          po_reference: formData.po_reference,
          price_per_kg: Number(formData.price_per_kg), 
          gst_percent: Number(formData.gst_percent),
          base_amount: baseAmount, 
          gst_amount: gstAmount, 
          total_amount: totalAmount,
          date_received: formData.date_received || new Date().toISOString(),
          notes: formData.notes
        };

        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');

        const finalBatches = newBatches.map(b => {
          const batchId = `MAT-${dateStr}-${productCode}-${String(b.batch_no).padStart(3, '0')}`;
          const batchValue = b.quantity * Number(formData.price_per_kg) * (1 + (Number(formData.gst_percent)/100));
          const qrDataPayload = b.serialNumber;

          // Validation
          if (!selectedMaterial.name || !batchId || !qrDataPayload || b.quantity == null || !formData.vendor_name) {
            throw new Error("Missing required fields for batch generation.");
          }

          return {
            batch_id: batchId, 
            serial_number: b.serialNumber,
            material_id: selectedMaterial.id,
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
            status: 'Active',
            inventory_room_saved: false,
            barcode_status: 'Barcode Saved'
          };
        });

        const savedIds = await rawMaterialService.saveRawMaterialIntake(inventoryInRecord, finalBatches);
        setSavedBatchIds(savedIds as any);
      }
      
      setIsSaved(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
    } catch (err: any) {
      console.error("Save barcode Supabase error:", err);
      alert(`Failed to save barcode: ${err.message || 'Unknown error'}`);
    }
  };

  const handleReceiveAnother = () => {
    setSelectedMaterial(null);
    setFormData({ quantity_received: '', vendor_name: '', po_reference: '', price_per_kg: '', gst_percent: '18', notes: '', date_received: new Date().toISOString().slice(0,10) });
    setBatches([]);
    navigate('/raw-material');
  };

  const downloadQR = (serial: string) => {
    // Select the svg inside the wrapper
    const wrapper = document.getElementById(`barcode-${serial}`);
    const svg = wrapper?.querySelector('svg');
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
      downloadLink.download = `Barcode-${serial}.png`;
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
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <CheckCircle size={20} />
          <span style={{ fontWeight: 500 }}>Barcode saved successfully</span>
        </div>
      )}

      <div className="page-header">
        <h1>Step 3: Generate Barcode Labels</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print All
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadAll}>
            <Download size={16} /> Download All
          </button>
        </div>
      </div>

      <div className="grid grid-3 print-grid" style={{ marginBottom: '24px' }}>
        {previewBatches.map((b) => {


          return (
            <div key={b.id} className="page-card print-label" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
              <div className="label-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
                  <div id={`barcode-${b.serialNumber}`} className="qr-wrapper" style={{ background: 'white', padding: '0px', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-block', maxWidth: '100%' }}>
                    <Barcode 
                      value={b.serialNumber} 
                      width={1.5}
                      height={40}
                      displayValue={false}
                      margin={10}
                      background="#ffffff"
                      lineColor="#000000"
                    />
                  </div>
                </div>
                
                <h3 className="label-title" style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  {selectedMaterial.name}
                </h3>
                
                <div className="label-serial" style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--primary)', fontFamily: 'monospace', marginBottom: '12px' }}>
                  {b.serialNumber}
                </div>
                
                <div className="label-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left', background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px', fontSize: '12px', marginBottom: '20px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Quantity:</span> <br/><b>{b.quantity} KG</b></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Batch No:</span> <br/><b>{b.batch_no}</b></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Vendor:</span> <br/><b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{formData.vendor_name}</b></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <br/><b>{formData.date_received || new Date().toISOString().slice(0,10)}</b></div>
                </div>
              </div>
              
              <div className="no-print" style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '0 8px' }} onClick={() => downloadQR(b.serialNumber)}>
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        {!isSaved ? (
          <>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
              <button className="btn btn-secondary" onClick={() => navigate('/raw-material/split-batches')}>Back</button>
            </div>
            <button className="btn btn-primary" onClick={handleSaveBarcode}><Save size={18} /> Save Barcode</button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%' }}>
            <button className="btn btn-secondary" onClick={handleReceiveAnother}>Receive Another Material</button>
            <button className="btn btn-primary" onClick={() => navigate('/view-barcode')}>Go to View Barcode</button>
          </div>
        )}
      </div>
    </>
  );
};

export default IntakeStep3_Barcode;
