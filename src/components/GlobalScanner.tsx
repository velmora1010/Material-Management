import { useState, useEffect, useRef } from 'react';
import { Scan, X, PackageCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { sendScanWebhook } from '../services/webhookService';

const GlobalScanner = () => {
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scannedBatch, setScannedBatch] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const scannerBuffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    if (isScanModalOpen && inputRef.current && !scannedBatch) {
      inputRef.current.focus();
    }
  }, [isScanModalOpen, scannedBatch]);

  const processBarcode = async (payload: string) => {
    const code = payload.trim();
    if (!code) {
      setError('Please enter a barcode number.');
      return;
    }
    
    setError(null);
    setScannedBatch(null);
    setIsScanModalOpen(true);
    setIsProcessing(true);

    try {
      console.log("Detected barcode:", code);
      console.log("Searching barcode:", code);

      // Fallback search logic: try exact match on serial_number, batch_id, barcode_data
      // If not found, fetch recent rows and parse JSON barcode_data
      const { data, error: sbError } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      console.log("Barcode search result:", data, sbError);

      if (sbError || !data || data.length === 0) {
        setIsProcessing(false);
        setError(`Barcode not found in recent database`);
        return;
      }

      let foundBatch = null;

      // 1, 2, 3: Exact matches
      foundBatch = data.find(item => 
        item.serial_number === code || 
        item.batch_id === code || 
        item.barcode_data === code
      );

      // 4: Parse JSON matches
      if (!foundBatch) {
        foundBatch = data.find(item => {
          if (!item.barcode_data) return false;
          try {
            const parsed = JSON.parse(item.barcode_data);
            return parsed.barcode_no === code || 
                   parsed.batchId === code || 
                   parsed.serial_number === code || 
                   parsed.barcodeNo === code;
          } catch (e) {
            return false;
          }
        });
      }

      if (!foundBatch) {
        setIsProcessing(false);
        setError(`Barcode not found`);
        return;
      }

      setScannedBatch(foundBatch);
      setScanInput(code); // Update the input field with the found code
      setIsProcessing(false);
      
      const isAlreadyScanned = foundBatch.inventory_room_saved || foundBatch.barcode_status === 'Stock In' || foundBatch.status === 'Stock In';
      setShowConfirm(!isAlreadyScanned);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setError('An error occurred while scanning.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys and other control keys
      if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Tab' || e.key === 'Escape') {
        return;
      }

      const currentTime = Date.now();

      // If time between keys is more than 100ms, reset buffer (normal typing is slower)
      if (currentTime - lastKeyTime.current > 100) {
        scannerBuffer.current = '';
      }

      lastKeyTime.current = currentTime;

      console.log("Scanner key:", e.key);

      if (e.key === 'Enter') {
        const code = scannerBuffer.current.trim();
        console.log("Scanner buffer:", scannerBuffer.current);
        scannerBuffer.current = '';

        if (code.length >= 4) {
          e.preventDefault(); // Stop normal form submit or newlines
          processBarcode(code);
        }
      } else {
        if (e.key.length === 1) {
          scannerBuffer.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    setIsScanModalOpen(false);
    setScannedBatch(null);
    setScanInput('');
    setError(null);
    setShowConfirm(false);
  };

  const handleConfirmStockIn = async () => {
    if (!scannedBatch) return;
    try {
      const { error } = await supabase.from('batches').update({
        inventory_room_saved: true,
        barcode_status: 'Stock In',
        status: 'Stock In',
        stock_in_at: new Date().toISOString()
      }).eq('id', scannedBatch.id);

      if (error) throw error;
      
      // Send webhook after successful DB update
      await sendScanWebhook(scannedBatch);
      
      setToastMessage('Barcode scanned successfully');
      setShowConfirm(false);
      setScannedBatch({...scannedBatch, inventory_room_saved: true, barcode_status: 'Stock In', status: 'Stock In'});

      setTimeout(() => {
        setToastMessage('');
        setIsScanModalOpen(false);
        setScannedBatch(null);
        navigate('/inventory-room');
      }, 1500);
      
    } catch (err) {
      console.error('Error confirming stock in:', err);
      setError('Failed to save to Inventory Room.');
    }
  };

  return (
    <>
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', background: '#10b981', color: 'white',
          padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 100, animation: 'slideInRight 0.3s ease-out'
        }}>
          <PackageCheck size={20} />
          <span style={{ fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

      <button 
        className="btn btn-secondary scanner-header-btn" 
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
              <h2>{scannedBatch ? (showConfirm ? 'Confirm Barcode Scan' : 'Already Scanned') : 'Barcode Scanner Test'}</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={handleClose}><X size={24} /></button>
            </div>

            {!scannedBatch ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Scanner Input Box</label>
                  <input 
                    ref={inputRef as any}
                    autoFocus
                    required
                    type="text"
                    placeholder='Scan barcode here...'
                    value={scanInput} 
                    onChange={e => {
                      setScanInput(e.target.value);
                      console.log("Scanner input changed:", e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        processBarcode(scanInput);
                      }
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid var(--primary)', fontFamily: 'monospace', fontSize: '16px' }} 
                  />
                  {error && <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px', fontWeight: 500 }}>{error}: [{scanInput}]</div>}
                </div>
                
                <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--surface-soft)', borderRadius: '8px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>Last Scanned Value:</strong>
                    <span style={{ fontFamily: 'monospace' }}>{scanInput || '--'}</span>
                  </div>
                  <div>
                    <strong>Status:</strong> {error ? <span style={{ color: '#dc2626' }}>Barcode not found</span> : (isProcessing ? 'Searching...' : 'Waiting for scan...')}
                  </div>
                  {error && <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>Please check whether barcode was saved in View Barcode.</div>}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={() => processBarcode(scanInput)}>Test Search Button</button>
                </div>
              </>
            ) : (
              <div>
                {showConfirm ? (
                  <>
                    <p style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
                      Do you want to scan this barcode into Inventory Room?
                    </p>
                    <div style={{ background: 'var(--surface-soft)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Material Name</span><strong>{scannedBatch.material_name}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Barcode Number</span><strong>{scannedBatch.serial_number}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Quantity KG</span><strong>{scannedBatch.original_quantity} KG</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Vendor</span><strong>{scannedBatch.vendor_name}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Batch No</span><strong>{scannedBatch.batch_number}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Date</span><strong>{new Date(scannedBatch.created_at).toISOString().slice(0,10)}</strong></div>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ marginBottom: '20px', color: '#065f46', fontWeight: 500 }}>
                      This barcode is already scanned.
                    </p>
                    <div style={{ background: 'var(--surface-soft)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Material Name</span><strong>{scannedBatch.material_name}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Barcode Number</span><strong>{scannedBatch.serial_number}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Quantity KG</span><strong>{scannedBatch.original_quantity} KG</strong></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Scanned Date</span><strong>{scannedBatch.stock_in_at ? new Date(scannedBatch.stock_in_at).toLocaleDateString() : 'N/A'}</strong></div>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  {showConfirm ? (
                    <>
                      <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                      <button type="button" className="btn btn-primary" onClick={handleConfirmStockIn}>
                        Confirm Scan
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={handleClose}>Close</button>
                  )}
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
