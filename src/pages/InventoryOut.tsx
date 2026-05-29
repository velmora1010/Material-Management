import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Search, CheckCircle2 } from 'lucide-react';
import db from '../db/db';

const InventoryOut = () => {
  const [manualBatchId, setManualBatchId] = useState('');
  const [batchData, setBatchData] = useState<any>(null);
  const [materialName, setMaterialName] = useState('');
  
  const [outForm, setOutForm] = useState({ quantity_out: '', purpose: '', reference_no: '', notes: '' });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const scanner = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 10 }, false);
      scanner.render(onScanSuccess, () => {});
      return () => { scanner.clear().catch(e => console.error(e)); };
    } catch(e) {
      console.warn("QR Scanner init failed", e);
    }
  }, []);

  const onScanSuccess = (decodedText: string) => {
    try { const data = JSON.parse(decodedText); if (data.batchId) loadBatchData(data.batchId); else setError('Invalid QR Code format.'); }
    catch { loadBatchData(decodedText); }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBatchData(manualBatchId);
  };

  const loadBatchData = async (bId: string) => {
    setError(''); setSuccess(false);
    const batch = await db.batches.where('batch_id').equals(bId).first();
    if (batch) {
      setBatchData(batch);
      const material = await db.raw_materials.get(batch.product_id);
      setMaterialName(material?.name || 'Unknown Material');
    } else {
      setBatchData(null);
      setError('Batch ID not found in database.');
    }
  };

  const handleOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchData) return;
    const qtyOut = Number(outForm.quantity_out);
    if (qtyOut <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (qtyOut > batchData.available_quantity) {
      setError(`Quantity cannot exceed available stock (${batchData.available_quantity} KG).`);
      return;
    }
    
    const newQty = batchData.available_quantity - qtyOut;
    let newStatus = batchData.status;
    if (newQty === 0) newStatus = 'Completed';
    else if (newQty < (batchData.original_quantity * 0.2)) newStatus = 'Low Stock';

    await db.transaction('rw', db.batches, db.inventory_out, async () => {
      await db.batches.update(batchData.id, { available_quantity: newQty, status: newStatus });
      await db.inventory_out.add({
        batch_id: batchData.batch_id, product_id: batchData.product_id,
        quantity_out: qtyOut, purpose: outForm.purpose,
        reference_no: outForm.reference_no, date: new Date().toISOString(),
        notes: outForm.notes, created_at: new Date().toISOString()
      });
    });

    setSuccess(true);
    setError('');
    setOutForm({ quantity_out: '', purpose: '', reference_no: '', notes: '' });
    loadBatchData(batchData.batch_id);
    
    // Hide toast after 3 seconds
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="page" style={{ position: 'relative' }}>
      <div className="page-header">
        <h1>Inventory Out</h1>
      </div>

      {success && (
        <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', background: 'var(--success-bg)', border: '1px solid var(--success-text)', color: 'var(--success-text)', padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <CheckCircle2 size={24} color="var(--success-text)" />
          <span style={{ fontWeight: 'bold' }}>Inventory successfully deducted!</span>
        </div>
      )}

      <div className="grid grid-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="page-card">
            <h2 style={{ fontSize: '18px', margin: '0 0 20px 0' }}>Scan QR Code</h2>
            <div id="reader" style={{ width: '100%', background: 'var(--surface-soft)', borderRadius: '12px', overflow: 'hidden' }}></div>
          </div>

          <div className="page-card">
            <h2 style={{ fontSize: '18px', margin: '0 0 20px 0' }}>Manual Entry</h2>
            <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '16px' }}>
              <input type="text" placeholder="Enter Batch ID" value={manualBatchId} onChange={e => setManualBatchId(e.target.value)} style={{ textTransform: 'uppercase', fontFamily: 'monospace' }} />
              <button type="submit" className="btn btn-secondary" style={{ width: '120px' }}><Search size={18} /> Search</button>
            </form>
          </div>
        </div>

        <div className="page-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 20px 0', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>Batch Dispatch Details</h2>
          
          {!batchData ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: '80px', height: '80px', background: 'var(--surface-soft)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Search size={32} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Awaiting Target</h4>
              <p style={{ fontSize: '14px' }}>Scan a QR code or manually search for a Batch ID to load its dispatch parameters.</p>
              {error && <div style={{ marginTop: '24px', padding: '16px', background: 'var(--danger)', color: 'white', borderRadius: '12px', fontWeight: 'bold', width: '100%' }}>{error}</div>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              
              <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'inline-block', background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '8px' }}>{batchData.batch_id}</div>
                    <h4 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{materialName}</h4>
                  </div>
                  <div className={`badge ${batchData.status === 'Completed' ? 'badge-neutral' : batchData.status === 'Low Stock' ? 'badge-warning' : 'badge-success'}`}>
                    {batchData.status}
                  </div>
                </div>
                
                <div className="grid grid-2" style={{ marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Vendor</span> 
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{batchData.vendor_name}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Unit Cost</span> 
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>₹{batchData.price_per_kg} / KG</span>
                  </div>
                </div>
                
                <div style={{ background: 'var(--surface)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Available Stock</span>
                  <div>
                    <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)', lineHeight: 1 }}>{batchData.available_quantity.toFixed(2)}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold', marginLeft: '8px' }}>/ {batchData.original_quantity} KG</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleOutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, opacity: batchData.available_quantity === 0 ? 0.5 : 1, pointerEvents: batchData.available_quantity === 0 ? 'none' : 'auto' }}>
                <div className="form-group">
                  <label>Quantity Out (KG) *</label>
                  <input required type="number" min="0.1" step="0.1" max={batchData.available_quantity} value={outForm.quantity_out} onChange={e => setOutForm({...outForm, quantity_out: e.target.value})} style={{ fontSize: '24px', fontWeight: 'bold', height: '60px', textAlign: 'center' }} autoFocus />
                  {error && <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', marginTop: '8px' }}>{error}</div>}
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Destination / Purpose *</label>
                    <input required type="text" value={outForm.purpose} onChange={e => setOutForm({...outForm, purpose: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Auth Ticket No.</label>
                    <input type="text" value={outForm.reference_no} onChange={e => setOutForm({...outForm, reference_no: e.target.value})} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Additional Notes</label>
                  <textarea value={outForm.notes} onChange={e => setOutForm({...outForm, notes: e.target.value})} />
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setBatchData(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={batchData.available_quantity === 0}>Confirm Inventory Out</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryOut;
