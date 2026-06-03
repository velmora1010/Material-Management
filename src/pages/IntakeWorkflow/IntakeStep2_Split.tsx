import { useNavigate, Navigate } from 'react-router-dom';
import { useIntakeContext } from './IntakeContext';
import { Trash2, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';

const IntakeStep2_Split = () => {
  const navigate = useNavigate();
  const { selectedMaterial, formData, batches, setBatches } = useIntakeContext();

  if (!selectedMaterial) {
    return <Navigate to="/raw-material/intake" replace />;
  }

  const targetQty = Number(formData.quantity_received) || 0;
  const totalBatchQty = batches.reduce((acc, b) => acc + (b.quantity || 0), 0);
  const diff = targetQty - totalBatchQty;
  const isExact = Math.abs(diff) < 0.01;

  const handleAutoSplit = () => {
    // Attempt to extract container size from description (e.g. "Std 50kg container")
    let containerSize = targetQty; // Default to 1 batch if no info
    const match = selectedMaterial.description?.match(/(\d+)kg/i);
    if (match && match[1]) {
      containerSize = Number(match[1]);
    }

    if (containerSize > 0 && containerSize < targetQty) {
      const count = Math.ceil(targetQty / containerSize);
      let currentTotal = 0;
      const newBatches = Array.from({ length: count }).map((_, i) => {
        let qty = containerSize;
        if (i === count - 1) {
          qty = Number((targetQty - currentTotal).toFixed(2));
        }
        currentTotal += qty;
        return { id: crypto.randomUUID(), batch_no: i + 1, quantity: qty };
      });
      setBatches(newBatches);
    } else {
      setBatches([{ id: crypto.randomUUID(), batch_no: 1, quantity: targetQty }]);
    }
  };

  const updateBatch = (id: string, field: 'batch_no' | 'quantity', value: string) => {
    setBatches(batches.map(b => b.id === id ? { ...b, [field]: Number(value) } : b));
  };
  
  const addBatchRow = () => {
    const nextNo = batches.length > 0 ? Math.max(...batches.map(b => b.batch_no)) + 1 : 1;
    let defaultQty = 0;
    if (diff > 0) defaultQty = Number(diff.toFixed(2)); // auto-fill remaining if possible
    setBatches([...batches, { id: crypto.randomUUID(), batch_no: nextNo, quantity: defaultQty }]);
  };

  const deleteBatchRow = (id: string) => {
    if (batches.length > 1) {
      setBatches(batches.filter(b => b.id !== id));
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Step 2: Split Batches</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '24px' }}>
        <div>
          <div className="page-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Define Batches</h2>
              <button className="btn btn-secondary" onClick={handleAutoSplit}>Auto Split</button>
            </div>

            <div className="table-responsive">
              <table style={{ marginBottom: '20px', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Batch #</th>
                    <th>Quantity (KG)</th>
                    <th style={{ width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td><input type="number" min="1" value={b.batch_no} onChange={e => updateBatch(b.id, 'batch_no', e.target.value)} /></td>
                      <td><input type="number" step="0.1" value={b.quantity} onChange={e => updateBatch(b.id, 'quantity', e.target.value)} /></td>
                      <td>
                        <button className="btn btn-danger" onClick={() => deleteBatchRow(b.id)} style={{ width: '40px', padding: 0 }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '20px' }} onClick={addBatchRow}>
              <Plus size={18} /> Add Batch Row
            </button>

            <div style={{ 
              padding: '16px', 
              background: isExact ? 'var(--success-bg)' : diff < 0 ? 'var(--danger)' : 'var(--warning-bg)', 
              color: isExact ? 'var(--success-text)' : diff < 0 ? '#ffffff' : 'var(--warning-text)',
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px' 
            }}>
              {isExact ? <CheckCircle2 /> : <AlertTriangle />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>
                  Total Allocated: {totalBatchQty.toFixed(2)} / {targetQty} KG
                </div>
                {!isExact && diff > 0 && <div style={{ fontSize: '13px', marginTop: '2px' }}>Remaining to allocate: {diff.toFixed(2)} KG</div>}
                {!isExact && diff < 0 && <div style={{ fontSize: '13px', marginTop: '2px' }}>Over-allocated by: {Math.abs(diff).toFixed(2)} KG</div>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
                <button className="btn btn-secondary" onClick={() => navigate('/raw-material')}>Back</button>
              </div>
              <button className="btn btn-primary" disabled={!isExact} onClick={() => navigate('/raw-material/generate-barcode')}>Next → Generate Barcode</button>
            </div>
          </div>
        </div>

        <div>
          <div className="page-card" style={{ position: 'sticky', top: '96px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 20px 0', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Summary</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Material</div>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>{selectedMaterial.name}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Total Received</div>
                <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--primary)' }}>{targetQty} KG</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Vendor</div>
                <div style={{ fontWeight: 500 }}>{formData.vendor_name || '--'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>PO Reference</div>
                <div style={{ fontWeight: 500 }}>{formData.po_reference || '--'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Standard Container</div>
                <div style={{ fontWeight: 500 }}>{selectedMaterial.description || 'Not specified'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default IntakeStep2_Split;
