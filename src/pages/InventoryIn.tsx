import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import db from '../db/db';

const InventoryIn = () => {
  const [step, setStep] = useState(1);
  const materials = useLiveQuery(() => db.raw_materials.toArray()) || [];
  
  const [formData, setFormData] = useState({
    material_id: '', quantity_received: '', vendor_name: '', reference_no: '', price_per_kg: '', gst_percent: '18', notes: ''
  });
  
  const [batches, setBatches] = useState<{ id: string; batch_no: number; quantity: number }[]>([]);


  useEffect(() => {
    const draft = localStorage.getItem('inventoryInDraft');
    if (draft) {
      const parsed = JSON.parse(draft);
      setFormData(parsed.formData);
      if (parsed.batches?.length > 0) setBatches(parsed.batches);
    }
  }, []);

  useEffect(() => {
    if (step < 4) {
      localStorage.setItem('inventoryInDraft', JSON.stringify({ formData, batches }));
    }
  }, [formData, batches, step]);

  const clearDraft = () => {
    localStorage.removeItem('inventoryInDraft');
    setFormData({ material_id: '', quantity_received: '', vendor_name: '', reference_no: '', price_per_kg: '', gst_percent: '18', notes: '' });
    setBatches([]);
    setStep(1);
  };

  const selectedMaterial = materials.find(m => m.id === Number(formData.material_id));
  const baseAmount = (Number(formData.quantity_received) || 0) * (Number(formData.price_per_kg) || 0);
  const gstAmount = baseAmount * ((Number(formData.gst_percent) || 0) / 100);
  const totalAmount = baseAmount + gstAmount;

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (batches.length === 0) autoSplitBatches(1);
    setStep(2);
  };

  const autoSplitBatches = (count: number) => {
    const totalQty = Number(formData.quantity_received) || 0;
    const splitQty = Number((totalQty / count).toFixed(2));
    let currentTotal = 0;
    const newBatches = Array.from({ length: count }).map((_, i) => {
      let qty = splitQty;
      if (i === count - 1) qty = Number((totalQty - currentTotal).toFixed(2));
      currentTotal += qty;
      return { id: crypto.randomUUID(), batch_no: i + 1, quantity: qty };
    });
    setBatches(newBatches);
  };

  const updateBatch = (id: string, field: 'batch_no' | 'quantity', value: string) => {
    setBatches(batches.map(b => b.id === id ? { ...b, [field]: Number(value) } : b));
  };
  
  const addBatchRow = () => {
    const nextNo = batches.length > 0 ? Math.max(...batches.map(b => b.batch_no)) + 1 : 1;
    setBatches([...batches, { id: crypto.randomUUID(), batch_no: nextNo, quantity: 0 }]);
  };

  const deleteBatchRow = (id: string) => {
    if (batches.length > 1) {
      setBatches(batches.filter(b => b.id !== id));
    }
  };

  const totalBatchQty = batches.reduce((acc, b) => acc + (b.quantity || 0), 0);
  const targetQty = Number(formData.quantity_received) || 0;
  const isBatchValid = Math.abs(totalBatchQty - targetQty) < 0.01;

  const generateQRs = () => {
    if (!isBatchValid) return;
    setStep(3);
  };

  const saveToDatabase = async () => {
    const invInId = await db.inventory_in.add({
      material_id: Number(formData.material_id), material_name: selectedMaterial?.name || '', quantity_received: targetQty,
      vendor_name: formData.vendor_name, po_reference: formData.reference_no,
      price_per_kg: Number(formData.price_per_kg), gst_percent: Number(formData.gst_percent),
      base_amount: baseAmount, gst_amount: gstAmount, total_amount: totalAmount,
      notes: formData.notes, date_received: new Date().toISOString(), created_at: new Date().toISOString()
    });

    const productCode = selectedMaterial?.name.substring(0, 4).toUpperCase() || 'PROD';
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');

    const finalBatches = batches.map(b => {
      const batchId = `MAT-${dateStr}-${productCode}-${String(b.batch_no).padStart(3, '0')}`;
      const batchValue = b.quantity * Number(formData.price_per_kg) * (1 + (Number(formData.gst_percent)/100));
      return {
        batch_id: batchId, inventory_in_id: Number(invInId), material_id: Number(formData.material_id),
        batch_no: b.batch_no, original_quantity: b.quantity, available_quantity: b.quantity,
        vendor_name: formData.vendor_name, po_reference: formData.reference_no,
        price_per_kg: Number(formData.price_per_kg), gst_percent: Number(formData.gst_percent),
        batch_value: batchValue,
        qr_data: JSON.stringify({ batchId, productId: selectedMaterial?.id }),
        status: 'Active' as const, created_at: new Date().toISOString()
      };
    });

    await db.batches.bulkAdd(finalBatches as any, { allKeys: true });
    localStorage.removeItem('inventoryInDraft');
    setStep(4);
  };

  const downloadQR = (batchId: string) => {
    const svg = document.getElementById(`qr-${batchId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const downloadLink = document.createElement('a');
      downloadLink.download = `${batchId}.png`;
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventory In</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Main Content Area */}
        <div>
          {step === 1 && (
            <div className="page-card">
              <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '20px' }}>Step 1: Receive Material</h2>
              <form onSubmit={handleNextStep1} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label>Select Product *</label>
                  <select required value={formData.material_id} onChange={e => setFormData({...formData, material_id: e.target.value})}>
                    <option value="">-- Choose Material --</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Quantity Received (KG) *</label>
                    <input required type="number" step="0.1" min="0.1" value={formData.quantity_received} onChange={e => setFormData({...formData, quantity_received: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Price Per KG (₹) *</label>
                    <input required type="number" step="0.01" value={formData.price_per_kg} onChange={e => setFormData({...formData, price_per_kg: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Vendor Name *</label>
                    <input required type="text" value={formData.vendor_name} onChange={e => setFormData({...formData, vendor_name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Reference / PO Number *</label>
                    <input required type="text" value={formData.reference_no} onChange={e => setFormData({...formData, reference_no: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>GST % *</label>
                  <select required value={formData.gst_percent} onChange={e => setFormData({...formData, gst_percent: e.target.value})}>
                    <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary">Next: Split Batches</button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="page-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', margin: 0 }}>Step 2: Split Batches</h2>
                <button className="btn btn-secondary" onClick={() => autoSplitBatches(batches.length || 1)}>Auto Split</button>
              </div>
              
              <table style={{ marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th>Batch #</th>
                    <th>Quantity (KG)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td><input type="number" min="1" value={b.batch_no} onChange={e => updateBatch(b.id, 'batch_no', e.target.value)} /></td>
                      <td><input type="number" step="0.1" value={b.quantity} onChange={e => updateBatch(b.id, 'quantity', e.target.value)} /></td>
                      <td><button className="btn btn-danger" onClick={() => deleteBatchRow(b.id)}><Trash2 size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '20px' }} onClick={addBatchRow}>
                <Plus size={18} /> Add New Batch Row
              </button>

              <div style={{ padding: '16px', background: 'var(--surface-soft)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: isBatchValid ? 'var(--success-text)' : 'var(--warning-text)' }}>
                    Allocated: {totalBatchQty.toFixed(2)} / {targetQty} KG
                  </div>
                  {!isBatchValid && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>Remaining: {(targetQty - totalBatchQty).toFixed(2)} KG</div>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" disabled={!isBatchValid} onClick={generateQRs}>Next: Generate QR</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="page-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', margin: 0 }}>Step 3: Generate QR</h2>
                <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={16} /> Print All</button>
              </div>

              <div className="grid grid-2" style={{ marginBottom: '24px' }}>
                {batches.map((b) => (
                  <div key={b.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center', background: '#ffffff' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ background: 'white', padding: '10px', borderRadius: '8px' }}>
                        <QRCodeSVG id={`qr-MAT-TEMP-${b.batch_no}`} value={`TEMP-BATCH-${b.batch_no}`} size={100} />
                      </div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}>Batch #{b.batch_no}</div>
                    <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>{selectedMaterial?.name}</div>
                    <div className="badge badge-neutral">{b.quantity} KG</div>
                    <div style={{ marginTop: '16px' }}>
                      <button className="btn btn-secondary" style={{ width: '100%', color: '#0f172a' }} onClick={() => downloadQR(`qr-MAT-TEMP-${b.batch_no}`)}><Download size={16} /> Download PNG</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
                <button className="btn btn-primary" onClick={saveToDatabase}>Save Inventory</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="page-card" style={{ textAlign: 'center', padding: '64px 20px' }}>
              <CheckCircle2 size={64} style={{ color: 'var(--success-text)', margin: '0 auto 24px auto' }} />
              <h2 style={{ fontSize: '28px', margin: '0 0 16px 0' }}>Success!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Inventory has been recorded and batches generated.</p>
              
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '40px' }}>
                <div style={{ background: 'var(--surface-soft)', padding: '16px 32px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Received</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{targetQty} KG</div>
                </div>
                <div style={{ background: 'var(--surface-soft)', padding: '16px 32px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Value</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₹{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
              </div>

              <button className="btn btn-primary" onClick={clearDraft}>Receive New Material</button>
            </div>
          )}
        </div>

        {/* Right Sticky Summary Card */}
        {step < 4 && (
          <div>
            <div className="page-card" style={{ position: 'sticky', top: '96px' }}>
              <h3 style={{ fontSize: '16px', margin: '0 0 20px 0', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Material Summary</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Material</div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>{selectedMaterial?.name || '--'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Vendor</div>
                  <div style={{ fontWeight: 500 }}>{formData.vendor_name || '--'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Ref / PO No</div>
                  <div style={{ fontWeight: 500 }}>{formData.reference_no || '--'}</div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Base Amount</span>
                    <span style={{ fontWeight: 600 }}>₹{baseAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span>Tax ({formData.gst_percent}%)</span>
                    <span style={{ fontWeight: 600 }}>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px', color: 'var(--primary)' }}>
                    <span style={{ fontWeight: 'bold' }}>Total</span>
                    <span style={{ fontWeight: 'bold', fontSize: '18px' }}>₹{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryIn;
