import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { useIntakeContext } from './IntakeContext';
import { Package } from 'lucide-react';


const IntakeStep1_Form = () => {
  const navigate = useNavigate();
  const { selectedMaterial, setSelectedMaterial, formData, setFormData, setBatches } = useIntakeContext();
  const { data: rawMaterials = [], error, loading } = useSupabaseQuery<any>('raw_materials');
  
  useEffect(() => {
    if (error) {
      console.error('Supabase fetch failed:', error);
    }
  }, [error]);

  const defaultMaterials = [
    { id: 'fallback-1', name: 'SLES Paste', unit: 'KG', category: 'Surfactant', color_code: '#2563eb' },
    { id: 'fallback-2', name: 'CAPB', unit: 'KG', category: 'Surfactant', color_code: '#10b981' },
    { id: 'fallback-3', name: 'Salt', unit: 'KG', category: 'Thickener', color_code: '#64748b' },
    { id: 'fallback-4', name: 'AOS', unit: 'KG', category: 'Surfactant', color_code: '#0284c7' },
    { id: 'fallback-5', name: 'Fragrance - Lemon Blast', unit: 'KG', category: 'Fragrance', color_code: '#eab308' },
    { id: 'fallback-6', name: 'Fragrance - White Flower', unit: 'KG', category: 'Fragrance', color_code: '#fcd34d' },
    { id: 'fallback-7', name: 'Fragrance - Milk Saffron', unit: 'KG', category: 'Fragrance', color_code: '#f59e0b' },
    { id: 'fallback-8', name: 'Comfort Base', unit: 'KG', category: 'Base', color_code: '#3b82f6' },
    { id: 'fallback-9', name: 'Sodium Benzoate', unit: 'KG', category: 'Preservative', color_code: '#ec4899' },
    { id: 'fallback-10', name: 'Phenoxy Ethanol', unit: 'KG', category: 'Preservative', color_code: '#d946ef' },
    { id: 'fallback-11', name: 'N-Cap', unit: 'KG', category: 'Conditioning Agent', color_code: '#8b5cf6' },
    { id: 'fallback-12', name: 'Yellow Colour', unit: 'KG', category: 'Colorant', color_code: '#eab308' },
    { id: 'fallback-13', name: 'Blue Colour', unit: 'KG', category: 'Colorant', color_code: '#3b82f6' },
    { id: 'fallback-14', name: 'Violet Colour', unit: 'KG', category: 'Colorant', color_code: '#8b5cf6' },
    { id: 'fallback-15', name: 'Water', unit: 'KG', category: 'Solvent', color_code: '#0ea5e9' }
  ];

  const displayMaterials = rawMaterials.length > 0 ? rawMaterials : defaultMaterials;

  const uniqueMaterials = displayMaterials.filter(
    (item: any, index: number, self: any[]) =>
      index === self.findIndex(
        m => m.name === item.name
      )
  );

  if (loading && rawMaterials.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--text-muted)' }}>Loading materials...</h2>
      </div>
    );
  }

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
          {error && (
            <div style={{ gridColumn: '1 / -1', padding: '16px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px' }}>
              Failed to load materials from database. Showing default list. Error: {error.message}
            </div>
          )}
          {uniqueMaterials.map((m: any) => {
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


    </>
  );
};

export default IntakeStep1_Form;
