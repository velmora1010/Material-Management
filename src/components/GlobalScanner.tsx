import { useState, useEffect, useRef } from 'react';
import { Scan, X, Printer, PackageCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import db from '../db/db';

const GlobalScanner = () => {
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scannedBatch, setScannedBatch] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isScanModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanModalOpen]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setScannedBatch(null);

    try {
      const payload = scanInput.trim();
      
      if (!payload) {
        setError('Please enter a barcode number.');
        return;
      }

      // Try finding the batch by serial_number, batch_id, or barcode_data
      const batch = await db.batches.where('serial_number').equals(payload).first() 
                 || await db.batches.where('batch_id').equals(payload).first()
                 || await db.batches.where('barcode_data').equals(payload).first();

      if (!batch) {
        setError('Batch not found.');
        return;
      }

      setScannedBatch(batch);
      setScanInput('');
    } catch (err) {
      setError('An error occurred while scanning.');
    }
  };

  const handleClose = () => {
    setIsScanModalOpen(false);
    setScannedBatch(null);
    setScanInput('');
    setError(null);
  };

  const handleGoToInventory = () => {
    handleClose();
    navigate('/inventory-room');
  };

  return (
    <>
      <button 
        className="btn btn-secondary" 
        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
        onClick={() => setIsScanModalOpen(true)}
      >
        <Scan size={18} color="var(--primary)" />
        <span style={{ fontWeight: 500 }}>Global Scanner</span>
      </button>

      {isScanModalOpen && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content" style={{ width: scannedBatch ? '500px' : '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{scannedBatch ? 'Raw Material Batch Details' : 'Scan Barcode'}</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={handleClose}><X size={24} /></button>
            </div>

            {!scannedBatch ? (
              <form onSubmit={handleScanSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Simulate Barcode Scanner Input</label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Focus the input below and scan the barcode (e.g. YELL-10-1501).</p>
                  <input 
                    ref={inputRef as any}
                    autoFocus
                    required
                    type="text"
                    placeholder='YELL-10-1501'
                    value={scanInput} 
                    onChange={e => setScanInput(e.target.value)} 
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid var(--primary)', fontFamily: 'monospace', fontSize: '16px' }} 
                  />
                  {error && <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px', fontWeight: 500 }}>{error}</div>}
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Process Scan</button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ background: 'var(--surface-soft)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Material Name</span><strong style={{ fontSize: '16px', color: 'var(--primary)' }}>{scannedBatch.material_name}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Batch ID</span><strong>{scannedBatch.serial_number}</strong></div>
                    
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Batch Number</span><strong>{scannedBatch.batch_number}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Vendor Name</span><strong>{scannedBatch.vendor_name}</strong></div>
                    
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Available Quantity</span><strong style={{ color: scannedBatch.available_quantity > 0 ? '#10b981' : '#dc2626', fontSize: '16px' }}>{scannedBatch.available_quantity} KG</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Original Quantity</span><strong>{scannedBatch.original_quantity} KG</strong></div>
                    
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Received Date</span><strong>{scannedBatch.created_at.slice(0, 10)}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>PO Reference</span><strong>{scannedBatch.po_reference || '--'}</strong></div>
                    
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Price Per KG</span><strong>₹{scannedBatch.price_per_kg}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>GST %</span><strong>{scannedBatch.gst_percent}%</strong></div>
                    
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Batch Value</span><strong>₹{scannedBatch.batch_value?.toLocaleString()}</strong></div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Status</span>
                      <span style={{ 
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'inline-block',
                        background: scannedBatch.status === 'Active' ? 'var(--success-bg)' : scannedBatch.status === 'Low Stock' ? '#fef3c7' : '#fef2f2',
                        color: scannedBatch.status === 'Active' ? 'var(--success-text)' : scannedBatch.status === 'Low Stock' ? '#d97706' : '#dc2626'
                      }}>
                        {scannedBatch.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hidden print area for this specific batch */}
                <div style={{ display: 'none' }}>
                  <div id="print-single-label" className="print-label" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', width: '70mm', height: '50mm', background: 'white', color: 'black' }}>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                       <Barcode 
                          value={scannedBatch.serial_number} 
                          width={1.5} 
                          height={40} 
                          displayValue={false} 
                          margin={0} 
                          background="#ffffff" 
                          lineColor="#000000" 
                        />
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{scannedBatch.material_name}</h3>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', fontFamily: 'monospace', marginBottom: '8px' }}>{scannedBatch.serial_number}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', textAlign: 'left' }}>
                      <div>Qty: <b>{scannedBatch.original_quantity} KG</b></div>
                      <div>Date: <b>{scannedBatch.created_at.slice(0, 10)}</b></div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleClose}>Close</button>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      const printContent = document.getElementById('print-single-label');
                      if (printContent) {
                        const originalBody = document.body.innerHTML;
                        document.body.innerHTML = printContent.innerHTML;
                        window.print();
                        document.body.innerHTML = originalBody;
                        window.location.reload(); // Quick restore state
                      }
                    }}>
                      <Printer size={16} style={{ marginRight: '6px' }} /> Print Label
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleGoToInventory}>
                      <PackageCheck size={16} style={{ marginRight: '6px' }} /> Go to Inventory Room
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalScanner;
