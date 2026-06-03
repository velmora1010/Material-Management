import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Beaker, Factory, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabaseClient';
import { PRODUCTS, calculateRequiredIngredients } from '../../config/productFormulas';

const NewProductionBatch = () => {
  const navigate = useNavigate();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sizeType, setSizeType] = useState<'Full' | 'Micro' | 'Custom' | null>(null);
  const [customUnits, setCustomUnits] = useState<number>(500);
  const [producedBy, setProducedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const { data: allRawMaterialBatches = [] } = useSupabaseQuery<any>('batches');

  const selectedProduct = PRODUCTS.find(p => p.id === selectedProductId);

  // Micro Batch calculations
  const totalUnits = sizeType === 'Full' ? 500 : sizeType === 'Micro' ? 30 : customUnits;
  
  const microBatches = useMemo(() => {
    if (!totalUnits || totalUnits <= 0) return [];
    const count = Math.ceil(totalUnits / 30);
    let currentTotal = 0;
    return Array.from({ length: count }).map((_, i) => {
      let qty = 30;
      if (i === count - 1) {
        qty = totalUnits - currentTotal;
      }
      currentTotal += qty;
      return { no: i + 1, qty };
    });
  }, [totalUnits]);

  // Ingredients calculation
  const requiredIngredients = useMemo(() => {
    if (!selectedProductId || totalUnits <= 0) return null;
    return calculateRequiredIngredients(selectedProductId, totalUnits);
  }, [selectedProductId, totalUnits]);

  // Stock check
  const ingredientStatus = useMemo(() => {
    if (!requiredIngredients) return [];
    return requiredIngredients.map(ing => {
      // Aggregate all active stock for this material name
      const available = allRawMaterialBatches
        .filter(b => b.material_name === ing.name && (b.status === 'Active' || b.status === 'Low Stock'))
        .reduce((sum, b) => sum + (b.available_quantity || 0), 0);
      
      return {
        name: ing.name,
        required: ing.required_quantity,
        available: Number(available.toFixed(3)),
        sufficient: available >= ing.required_quantity
      };
    });
  }, [requiredIngredients, allRawMaterialBatches]);

  const hasInsufficientStock = ingredientStatus.some(s => !s.sufficient);
  const canStart = selectedProduct && sizeType && !hasInsufficientStock && (requiredIngredients !== null);

  const handleStartBatch = async () => {
    console.log("Start Batch clicked");
    
    if (!producedBy.trim()) {
      alert("Please enter Produced By");
      return;
    }

    if (!canStart) return;

    try {
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const prodBatchId = `PROD-${dateStr}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      // 1. Create Production Batch
      const { data: batchData, error: batchError } = await supabase.from('production_batches').insert({
        production_batch_id: prodBatchId,
        product_name: selectedProduct.name,
        total_units: totalUnits,
        batch_type: sizeType === 'Full' ? 'Full Set' : sizeType === 'Micro' ? 'Micro Batch' : 'Custom',
        produced_by: producedBy.trim(),
        notes: notes.trim(),
        status: 'Prep',
        total_micro_batches: microBatches.length,
        completed_micro_batches: 0,
        produced_units: 0,
        inventory_units: 0
      }).select('id').single();

      if (batchError) {
        throw batchError;
      }
      const dbBatchId = batchData.id;

      // 2. Create Micro Batches
      const microBatchRecords = microBatches.map(mb => ({
        production_batch_id: prodBatchId,
        micro_batch_no: mb.no,
        units: mb.qty,
        status: 'Waiting'
      }));
      const { error: mbError } = await supabase.from('production_micro_batches').insert(microBatchRecords);
      if (mbError) throw mbError;

      // 3. Create Required Ingredients
      const ingredientRecords = requiredIngredients.map(ing => ({
        production_batch_id: prodBatchId,
        material_name: ing.name,
        required_quantity: ing.required_quantity,
        available_quantity_at_start: ingredientStatus.find(s => s.name === ing.name)?.available || 0,
        scanned_quantity: 0,
        status: 'Pending'
      }));
      const { error: ingError } = await supabase.from('production_ingredients').insert(ingredientRecords);
      if (ingError) throw ingError;

      // Navigate to detail page
      navigate(`/production/batch/${dbBatchId}`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to create production batch");
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '48px' }}>
      <div className="page-header">
        <div>
          <button className="btn btn-secondary" style={{ marginBottom: '12px', padding: '4px 12px', fontSize: '12px', height: 'auto' }} onClick={() => navigate('/production')}>
            ← Back to Dashboard
          </button>
          <h1>New Production Batch</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Configure product, size, and verify raw materials.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Step 1: Select Product */}
        <div className="page-card">
          <h2 style={{ fontSize: '18px', margin: '0 0 16px 0' }}>1. Select Product</h2>
          <div className="grid grid-4" style={{ gap: '16px' }}>
            {PRODUCTS.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                style={{ 
                  border: selectedProductId === p.id ? '2px solid #f97316' : '1px solid var(--border)',
                  background: selectedProductId === p.id ? 'var(--surface-soft)' : 'var(--surface)',
                  padding: '16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f97316', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {p.iconType === 'liquid' ? <Beaker size={20} /> : <Package size={20} />}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{p.name}</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Select Batch Size */}
        {selectedProductId && (
          <div className="page-card">
            <h2 style={{ fontSize: '18px', margin: '0 0 16px 0' }}>2. Select Batch Size</h2>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <button 
                className={`btn ${sizeType === 'Full' ? 'btn-primary' : 'btn-secondary'}`} 
                style={sizeType === 'Full' ? { background: '#f97316', borderColor: '#f97316' } : {}}
                onClick={() => { setSizeType('Full'); setCustomUnits(500); }}
              >
                Full Set (500 units)
              </button>
              <button 
                className={`btn ${sizeType === 'Micro' ? 'btn-primary' : 'btn-secondary'}`} 
                style={sizeType === 'Micro' ? { background: '#f97316', borderColor: '#f97316' } : {}}
                onClick={() => { setSizeType('Micro'); setCustomUnits(30); }}
              >
                Micro Batch (30 units)
              </button>
              <button 
                className={`btn ${sizeType === 'Custom' ? 'btn-primary' : 'btn-secondary'}`} 
                style={sizeType === 'Custom' ? { background: '#f97316', borderColor: '#f97316' } : {}}
                onClick={() => setSizeType('Custom')}
              >
                Custom Units
              </button>
            </div>
            
            {sizeType === 'Custom' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Enter Custom Unit Count:</label>
                <input 
                  type="number" 
                  min="1" 
                  value={customUnits} 
                  onChange={e => setCustomUnits(Number(e.target.value) || 0)} 
                  style={{ width: '200px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                />
              </div>
            )}

            {sizeType && (
              <div style={{ background: 'var(--surface-soft)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Micro Batch Breakdown ({microBatches.length} total)</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {microBatches.map(mb => (
                    <div key={mb.no} style={{ background: 'var(--surface)', padding: '4px 12px', borderRadius: '16px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600 }}>
                      MB{mb.no}: {mb.qty}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Ingredients & Stock Check */}
        {sizeType && selectedProduct && (
          <div className="page-card">
            <h2 style={{ fontSize: '18px', margin: '0 0 16px 0' }}>3. Total Ingredients Needed</h2>
            
            {requiredIngredients === null ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <AlertTriangle size={32} style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Formula not configured yet.</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>Please set up the formula for {selectedProduct.name} to proceed.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '24px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '12px', fontWeight: 600 }}>Ingredient Name</th>
                      <th style={{ padding: '12px', fontWeight: 600 }}>Required (KG)</th>
                      <th style={{ padding: '12px', fontWeight: 600 }}>Available (KG)</th>
                      <th style={{ padding: '12px', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientStatus.map((ing, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px', fontWeight: 500 }}>{ing.name}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{ing.required.toFixed(2)}</td>
                        <td style={{ padding: '12px', color: ing.sufficient ? 'var(--text-primary)' : '#dc2626', fontWeight: 500 }}>
                          {ing.available.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {ing.sufficient ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success-text)', fontSize: '13px', fontWeight: 600 }}>
                              <CheckCircle2 size={16} /> Sufficient
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '13px', fontWeight: 600 }}>
                              <AlertTriangle size={16} /> Insufficient stock for {ing.name}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {hasInsufficientStock ? (
                  <div style={{ padding: '16px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <AlertTriangle size={24} />
                    <div style={{ fontWeight: 600 }}>Cannot start batch. Required raw materials are not available in inventory.</div>
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <CheckCircle2 size={24} />
                    <div style={{ fontWeight: 600 }}>All required raw materials are available. You can start this batch.</div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Produced By <span style={{ color: '#dc2626' }}>*</span></label>
                    <input 
                      type="text" 
                      placeholder="Enter name"
                      value={producedBy} 
                      onChange={e => setProducedBy(e.target.value)} 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Notes (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Add any notes"
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                  <button className="btn btn-secondary" onClick={() => navigate('/production')}>Cancel</button>
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    style={canStart ? { background: '#f97316', borderColor: '#f97316' } : {}}
                    disabled={!canStart} 
                    onClick={handleStartBatch}
                  >
                    <Factory size={18} /> Start Batch
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewProductionBatch;
