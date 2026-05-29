import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useIntakeContext } from './IntakeContext';
import { Package } from 'lucide-react';
import db from '../../db/db';
import SavedStockLedger from './SavedStockLedger';

const IntakeStep1_Form = () => {
  const navigate = useNavigate();
  const { selectedMaterial, setSelectedMaterial, formData, setFormData, setBatches } = useIntakeContext();
  const rawMaterials = useLiveQuery(() => db.raw_materials.toArray()) || [];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    
    const qty = Number(formData.quantity_received) || 0;
    // Auto-setup batch 1
    setBatches([{ id: crypto.randomUUID(), batch_no: 1, quantity: qty }]);
    
    navigate('/raw-material/split-batches');
  };

  const baseAmount = (Number(formData.quantity_received) || 0) * (Number(formData.price_per_kg) || 0);
  const gstAmount = baseAmount * ((Number(formData.gst_percent) || 0) / 100);
  const totalAmount = baseAmount + gstAmount;

  return (
    <>
      <div className="page-header">
        <h1>Step 1: Raw Material Intake</h1>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Select Material</h2>
        <div className="grid grid-4">
          {rawMaterials.map(m => {
            const isSelected = selectedMaterial?.id === m.id;
            return (
              <div 
                key={m.id} 
                className="page-card"
                onClick={() => setSelectedMaterial(m)}
                style={{ 
                  cursor: 'pointer', 
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--surface-soft)' : 'var(--surface)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: m.color_code, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={20} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{m.name}</h3>
                  {m.description && <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{m.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedMaterial && (
        <div className="modal-overlay" onClick={() => setSelectedMaterial(null)}>
          <div className="modal-content" style={{ width: '720px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Receive Raw Material</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>Selected Material: <strong style={{ color: 'var(--primary)' }}>{selectedMaterial.name}</strong></p>
              </div>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => setSelectedMaterial(null)}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Quantity Received (KG) *</label>
                  <input required type="number" step="0.1" min="0.1" value={formData.quantity_received} onChange={e => setFormData({...formData, quantity_received: e.target.value})} autoFocus />
                </div>
                <div className="form-group">
                  <label>Vendor Name *</label>
                  <input required type="text" value={formData.vendor_name} onChange={e => setFormData({...formData, vendor_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Price Per KG (₹) *</label>
                  <input required type="number" step="0.01" min="0" value={formData.price_per_kg} onChange={e => setFormData({...formData, price_per_kg: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>PO Reference / Bill No *</label>
                  <input required type="text" value={formData.po_reference} onChange={e => setFormData({...formData, po_reference: e.target.value})} />
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>GST % *</label>
                  <select required value={formData.gst_percent} onChange={e => setFormData({...formData, gst_percent: e.target.value})}>
                    <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Received Date</label>
                  <input type="date" value={formData.date_received} onChange={e => setFormData({...formData, date_received: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>

              <div style={{ background: 'var(--surface-soft)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Base Amount</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{baseAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>GST Amount</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--primary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Amount</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>₹{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedMaterial(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!selectedMaterial}>
                  Next → Split Batches
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SavedStockLedger />
    </>
  );
};

export default IntakeStep1_Form;
