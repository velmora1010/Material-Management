import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckSquare, Square, QrCode, Play, Printer, CheckCircle2, Home, PackagePlus, Boxes } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabaseClient';
import { calculateRequiredIngredients } from '../../config/productFormulas';

const ProductionBatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanningIngredient, setScanningIngredient] = useState<any>(null);
  const [scanSerialInput, setScanSerialInput] = useState('');
  
  const [failModalOpen, setFailModalOpen] = useState(false);
  const [failingMicroBatch, setFailingMicroBatch] = useState<any>(null);
  const [failReason, setFailReason] = useState('Quality issue');

  const [barcodeModalOpen, setBarcodeModalOpen] = useState<any>(null);
  const [forceShowMicroBatches, setForceShowMicroBatches] = useState(false);

  const { data: productionBatches = [], refetch: refetchBatch } = useSupabaseQuery<any>('production_batches', q => q.eq('id', id));
  const productionBatch = productionBatches[0];

  const prodBatchId = productionBatch?.production_batch_id || '';
  
  const { data: ingredientsData, loading: ingredientsLoading, refetch: refetchIng } = useSupabaseQuery<any>('production_ingredients', q => q.eq('production_batch_id', prodBatchId), [prodBatchId]);
  const ingredients = ingredientsData || [];
  
  const { data: microBatchesData, refetch: refetchMb } = useSupabaseQuery<any>('production_micro_batches', q => q.eq('production_batch_id', prodBatchId), [prodBatchId]);
  const microBatches = microBatchesData || [];

  const [isRestoring, setIsRestoring] = useState(false);

  // Auto-restore ingredients if missing
  useEffect(() => {
    const restoreIngredients = async () => {
      if (!ingredientsLoading && ingredients.length === 0 && productionBatch && !isRestoring) {
        setIsRestoring(true);
        try {
          const { PRODUCTS } = await import('../../config/productFormulas');
          const product = PRODUCTS.find(p => p.name === productionBatch.product_name);
          
          if (product) {
            const reqIngs = calculateRequiredIngredients(product.id, productionBatch.total_units);
            if (reqIngs) {
              const records = reqIngs.map(ing => ({
                production_batch_id: prodBatchId,
                material_name: ing.name,
                required_quantity: ing.required_quantity,
                available_quantity_at_start: 0,
                scanned_quantity: 0,
                status: 'Pending'
              }));
              await supabase.from('production_ingredients').insert(records);
              refetchIng();
            }
          }
        } catch (err) {
          console.error("Auto-restore failed:", err);
        } finally {
          setIsRestoring(false);
        }
      }
    };
    restoreIngredients();
  }, [ingredientsLoading, ingredients.length, productionBatch, isRestoring, prodBatchId, refetchIng]);

  const handleToggleIngredient = async (ing: any) => {
    const newStatus = ing.status === 'Ready' ? 'Pending' : 'Ready';
    await supabase.from('production_ingredients').update({ status: newStatus }).eq('id', ing.id);
    refetchIng();
  };

  const handleScanRawMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanningIngredient || !productionBatch) return;

    const { data: rawBatches } = await supabase.from('batches').select('*').eq('serial_number', scanSerialInput);
    const rawBatch = rawBatches?.[0];
    
    if (!rawBatch) {
      alert('Error: Batch not found for this serial number.');
      return;
    }

    if (rawBatch.material_name !== scanningIngredient.material_name) {
      alert(`Error: Scanned batch is ${rawBatch.material_name}, but ${scanningIngredient.material_name} is required.`);
      return;
    }

    const requiredLeft = scanningIngredient.required_quantity - scanningIngredient.scanned_quantity;
    
    if (rawBatch.available_quantity <= 0) {
      alert('Error: This raw material batch is empty.');
      return;
    }

    const deductQty = Math.min(requiredLeft, rawBatch.available_quantity);
    const newAvailable = rawBatch.available_quantity - deductQty;

    await supabase.from('batches').update({
      available_quantity: newAvailable,
      status: newAvailable <= 0 ? 'Depleted' : newAvailable < (rawBatch.original_quantity * 0.2) ? 'Low Stock' : 'Active'
    }).eq('id', rawBatch.id);

    await supabase.from('raw_material_issues').insert({
      production_batch_id: productionBatch.production_batch_id,
      raw_material_batch_id: rawBatch.serial_number,
      material_name: rawBatch.material_name,
      quantity_issued: deductQty
    });

    const newScanned = scanningIngredient.scanned_quantity + deductQty;
    await supabase.from('production_ingredients').update({
      scanned_quantity: newScanned,
      status: newScanned >= scanningIngredient.required_quantity ? 'Ready' : 'Pending'
    }).eq('id', scanningIngredient.id);

    refetchIng();
    setScanSerialInput('');
    if (newScanned >= scanningIngredient.required_quantity) {
      setScanModalOpen(false);
      setScanningIngredient(null);
    } else {
      alert(`Partial scan accepted. ${deductQty} KG deducted. Still need ${(scanningIngredient.required_quantity - newScanned).toFixed(2)} KG.`);
    }
  };

  const handleStartMicroBatches = async () => {
    console.log("START MICRO BATCHES CLICKED");
    alert("Start Micro Batches clicked");

    if (!productionBatch) return;

    if (ingredients.length === 0) {
      alert("No ingredients found, but micro batch stage started.");
    }

    console.log("Creating micro batches for production batch:", productionBatch);
    console.log("Micro batches:", microBatches);

    // Minimum working behavior: UI updates immediately
    setForceShowMicroBatches(true);

    try {
      if (microBatches.length === 0 && productionBatch.total_micro_batches > 0) {
        const unitsPerBatch = Math.floor(productionBatch.total_units / productionBatch.total_micro_batches);
        
        const newMicroBatches = Array.from({ length: productionBatch.total_micro_batches }, (_, i) => ({
          production_batch_id: productionBatch.production_batch_id,
          micro_batch_no: i + 1,
          units: unitsPerBatch,
          status: 'Waiting'
        }));

        const { data, error: insertError } = await supabase.from('production_micro_batches').insert(newMicroBatches).select();
        console.log("Supabase insert micro batches result:", data, insertError);
        if (insertError) throw insertError;
      }

      const { data, error: updateError } = await supabase
        .from('production_batches')
        .update({ status: 'In Progress' })
        .eq('id', productionBatch.id)
        .select();

      console.log("Supabase update production_batches result:", data, updateError);
      if (updateError) throw updateError;

      refetchBatch();
      refetchMb();
    } catch (error: any) {
      console.error("Start Micro Batches failed:", error);
      alert(error.message || "Failed to start micro batches");
    }
  };

  const handlePassMicroBatch = async (mb: any) => {
    if (!productionBatch) return;
    const barcode = `${productionBatch.production_batch_id}-MB${String(mb.micro_batch_no).padStart(3, '0')}`;
    
    await supabase.from('production_micro_batches').update({
      status: 'Passed',
      barcode_data: barcode,
      completed_at: new Date().toISOString()
    }).eq('id', mb.id);

    const completedCount = productionBatch.completed_micro_batches + 1;
    const isNowComplete = completedCount === productionBatch.total_micro_batches;
    
    await supabase.from('production_batches').update({
      completed_micro_batches: completedCount,
      produced_units: productionBatch.produced_units + mb.units,
      status: isNowComplete ? 'Complete' : productionBatch.status
    }).eq('id', productionBatch.id);
    
    refetchBatch();
    refetchMb();
  };

  const handleFailMicroBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failingMicroBatch || !productionBatch) return;

    await supabase.from('production_micro_batches').update({
      status: 'Failed',
      failure_reason: failReason,
      completed_at: new Date().toISOString()
    }).eq('id', failingMicroBatch.id);

    const completedCount = productionBatch.completed_micro_batches + 1;
    await supabase.from('production_batches').update({
      completed_micro_batches: completedCount
    }).eq('id', productionBatch.id);

    refetchBatch();
    refetchMb();
    setFailModalOpen(false);
    setFailingMicroBatch(null);
  };

  const handleGenerateQR = async (mb: any) => {
    setBarcodeModalOpen(mb);
    
    // Auto-save to finished_goods_inventory if not already saved
    const { data: existing } = await supabase.from('finished_goods_inventory').select('id').eq('micro_batch_id', mb.id);
    
    if (existing?.length === 0 && productionBatch) {
      await supabase.from('finished_goods_inventory').insert({
        production_batch_id: productionBatch.production_batch_id,
        micro_batch_id: mb.id,
        product_name: productionBatch.product_name,
        units: mb.units,
        barcode_data: mb.barcode_data,
        status: 'In Stock'
      });
      
      const newInventoryCount = productionBatch.inventory_units + mb.units;
      await supabase.from('production_batches').update({
        inventory_units: newInventoryCount
      }).eq('id', productionBatch.id);
      
      refetchBatch();
    }
  };

  const handleFinishProduction = async () => {
    if (!productionBatch) return;
    await supabase.from('production_batches').update({ status: 'Saved' }).eq('id', productionBatch.id);
    refetchBatch();
  };

  if (!productionBatch) return <div style={{ padding: '48px', textAlign: 'center' }}>Loading...</div>;

  const checkedIngredientsCount = ingredients?.filter((i: any) => i.status === 'Ready').length || 0;
  const allIngredientsPrepared = ingredients && ingredients.length > 0 && checkedIngredientsCount === ingredients.length;

  let progress = 0;
  if (productionBatch.status === 'Prep') {
    progress = ingredients.length > 0 ? Math.round((checkedIngredientsCount / ingredients.length) * 100) : 0;
  } else {
    progress = productionBatch.total_micro_batches > 0 ? Math.round((productionBatch.completed_micro_batches / productionBatch.total_micro_batches) * 100) : 0;
  }

  const isFullyComplete = productionBatch.status === 'Complete';
  const showMicroBatches = forceShowMicroBatches || productionBatch.status === 'In Progress' || productionBatch.status === 'Complete';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '64px' }}>
      
      {/* HEADER */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <button className="btn btn-secondary" style={{ marginBottom: '12px', padding: '4px 12px', fontSize: '12px', height: 'auto' }} onClick={() => navigate('/production')}>
            ← Back to Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1>{productionBatch.product_name}</h1>
            <span style={{ 
              fontSize: '13px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '16px',
              background: isFullyComplete ? 'var(--success-bg)' : productionBatch.status === 'Prep' ? '#fef3c7' : '#e0e7ff', 
              color: isFullyComplete ? 'var(--success-text)' : productionBatch.status === 'Prep' ? '#d97706' : '#4f46e5', textTransform: 'uppercase'
            }}>
              {productionBatch.status}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>
            Batch ID: {productionBatch.production_batch_id} • {productionBatch.total_units} Units
          </p>
        </div>
      </div>

      {/* PROGRESS CARD */}
      <div className="page-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Total Ingredients Needed</h3>
            
            {!ingredientsLoading && ingredients.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', border: '1px solid #fecaca', marginBottom: '24px' }}>
                <div style={{ fontWeight: 600 }}>Ingredients not found. Please recreate this batch.</div>
              </div>
            )}
            
            {isRestoring && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading ingredients...
              </div>
            )}

            <div className="grid grid-2" style={{ gap: '16px', marginBottom: '24px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Produced Units:</span> <strong style={{ color: 'var(--text-primary)' }}>{productionBatch.produced_units}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Inventory Units:</span> <strong style={{ color: 'var(--text-primary)' }}>{productionBatch.inventory_units}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Micro Batches:</span> <strong style={{ color: 'var(--text-primary)' }}>{productionBatch.completed_micro_batches} / {productionBatch.total_micro_batches}</strong></div>
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)' }}>{progress}%</div>
        </div>
        <div style={{ width: '100%', height: '12px', background: 'var(--surface-soft)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* PRODUCTION COMPLETE UI */}
      {isFullyComplete && (
        <>
          <div className="page-card" style={{ marginBottom: '24px', textAlign: 'center', padding: '48px 20px', background: 'var(--surface)' }}>
            <CheckCircle2 size={64} style={{ color: 'var(--success-text)', margin: '0 auto 16px auto' }} />
            <h2 style={{ fontSize: '28px', margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Production Complete</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: 0 }}>
              All {productionBatch.total_units} units have passed quality control and are ready for labeling.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', margin: '0 0 20px 0' }}>QR Labels & Inventory</h2>
            <div className="grid grid-2" style={{ gap: '20px' }}>
              {microBatches.filter(m => m.status === 'Passed').map(mb => (
                <div key={mb.id} style={{ 
                  background: 'var(--surface-soft)', 
                  border: '1px solid #f97316', 
                  borderRadius: '12px', 
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-primary)' }}>Micro Batch {mb.micro_batch_no}</h3>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{mb.units} btls</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success-text)', fontSize: '13px', fontWeight: 600 }}>
                      <CheckCircle2 size={16} /> QC Passed &middot; {new Date(mb.completed_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <button 
                      className="btn btn-primary" 
                      style={{ background: '#f97316', borderColor: '#f97316', padding: '10px 20px' }}
                      onClick={() => handleGenerateQR(mb)}
                    >
                      <Printer size={16} style={{ marginRight: '8px' }} /> Generate QR Labels
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '16px' }} onClick={handleFinishProduction}>
              Save Finished Goods & Complete
            </button>
          </div>
        </>
      )}

      {/* FINAL SAVED SUCCESS UI */}
      {productionBatch.status === 'Saved' && (
        <div className="page-card" style={{ textAlign: 'center', padding: '64px 20px', marginTop: '24px' }}>
          <CheckCircle2 size={64} style={{ color: 'var(--success-text)', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '28px', margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Production Saved Successfully!</h2>
          <p style={{ color: 'var(--primary)', marginBottom: '40px', fontSize: '18px', fontWeight: 500 }}>
            Production saved successfully. Go to Inventory Room to view production stock.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/inventory-room')} style={{ padding: '0 24px', height: '48px' }}>
              <Boxes size={18} /> Go to Inventory Room
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/production/new-batch')} style={{ padding: '0 24px', height: '48px' }}>
              <PackagePlus size={18} /> Create Another Batch
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ padding: '0 24px', height: '48px' }}>
              <Home size={18} /> Home
            </button>
          </div>
        </div>
      )}

      {/* STAGE 1: PREPARATION */}
      {!isFullyComplete && productionBatch.status !== 'Saved' && (
        <div className="page-card" style={{ marginBottom: '24px', border: showMicroBatches ? '1px solid var(--border)' : '2px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Stage 1: Prepare All Ingredients
            </h2>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: allIngredientsPrepared ? 'var(--success-text)' : 'var(--text-muted)' }}>
              {checkedIngredientsCount} / {ingredients.length} checked
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '24px' }}>
            {ingredients.map(ing => (
              <div key={ing.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: ing.status === 'Ready' ? 'var(--success-bg)' : 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '8px', opacity: showMicroBatches ? 0.6 : 1 }}>
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: showMicroBatches ? 'default' : 'pointer', flex: 1 }}
                  onClick={() => { if (!showMicroBatches) handleToggleIngredient(ing); }}
                >
                  {ing.status === 'Ready' ? <CheckSquare size={20} color="var(--success-text)" /> : <Square size={20} color="var(--text-muted)" />}
                  <div>
                    <div style={{ fontWeight: 600, color: ing.status === 'Ready' ? 'var(--success-text)' : 'var(--text-primary)' }}>{ing.material_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Required: {ing.required_quantity} KG</div>
                  </div>
                </div>
                {!showMicroBatches && (
                  <button className="btn btn-secondary" style={{ padding: '6px 16px', height: 'auto', fontSize: '13px', color: '#3b82f6', borderColor: '#3b82f6' }} onClick={() => { setScanningIngredient(ing); setScanModalOpen(true); }}>
                    <QrCode size={14} style={{ marginRight: '6px' }} /> Scan to Deduct
                  </button>
                )}
              </div>
            ))}
          </div>

          {!showMicroBatches && allIngredientsPrepared && ingredients.length > 0 && (
            <div style={{ padding: '16px', background: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <CheckCircle2 size={24} />
              <div style={{ fontWeight: 600 }}>All ingredients prepared successfully.</div>
            </div>
          )}

          {!showMicroBatches && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                className="btn btn-primary" 
                style={allIngredientsPrepared ? { background: '#f97316', borderColor: '#f97316' } : {}}
                disabled={!allIngredientsPrepared}
                onClick={(e) => {
                  e.preventDefault();
                  handleStartMicroBatches();
                }}
              >
                <Play size={18} /> Start Micro Batches
              </button>
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: MICRO BATCHES */}
      {!isFullyComplete && productionBatch.status !== 'Saved' && showMicroBatches && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          <div className="page-card">
            <h2 style={{ fontSize: '18px', margin: '0 0 16px 0' }}>Stage 2: Micro Batches Execution</h2>
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '12px', fontWeight: 600 }}>MB No</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Units</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {microBatches.sort((a,b) => a.micro_batch_no - b.micro_batch_no).map((mb, index) => {
                    const isPrevCompleted = index === 0 || microBatches.find(m => m.micro_batch_no === mb.micro_batch_no - 1)?.status !== 'Waiting';
                    const isCurrent = isPrevCompleted && mb.status === 'Waiting';

                    return (
                      <tr key={mb.id} style={{ borderBottom: '1px solid var(--border)', background: isCurrent ? 'var(--surface-soft)' : 'transparent' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>Micro Batch {mb.micro_batch_no}</td>
                        <td style={{ padding: '12px' }}>{mb.units} units</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                            background: mb.status === 'Passed' ? 'var(--success-bg)' : mb.status === 'Failed' ? '#fef2f2' : 'var(--surface-soft)',
                            color: mb.status === 'Passed' ? 'var(--success-text)' : mb.status === 'Failed' ? '#dc2626' : 'var(--text-secondary)'
                          }}>
                            {mb.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {mb.status === 'Waiting' && isCurrent && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', height: 'auto', fontSize: '12px', color: '#16a34a', borderColor: '#16a34a' }} onClick={() => handlePassMicroBatch(mb)}>Pass</button>
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', height: 'auto', fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }} onClick={() => { setFailingMicroBatch(mb); setFailModalOpen(true); }}>Fail</button>
                            </div>
                          )}
                          {mb.status === 'Passed' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ color: 'var(--success-text)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={16}/> QC Passed</span>
                              <button className="btn btn-secondary" style={{ padding: '4px 12px', height: 'auto', fontSize: '12px', color: '#f97316', borderColor: '#f97316' }} onClick={() => setBarcodeModalOpen(mb)}>
                                <Printer size={14} style={{ marginRight: '4px' }} /> Generate QR Label
                              </button>
                            </div>
                          )}
                          {mb.status === 'Failed' && (
                            <span style={{ fontSize: '12px', color: '#dc2626' }}>{mb.failure_reason}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SCAN INGREDIENT MODAL */}
      {scanModalOpen && scanningIngredient && (
        <div className="modal-overlay" onClick={() => setScanModalOpen(false)}>
          <div className="modal-content" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Scan Raw Material</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setScanModalOpen(false)}>&times;</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Required Material:</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>{scanningIngredient.material_name}</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Still Need: <strong style={{ color: '#dc2626' }}>{(scanningIngredient.required_quantity - scanningIngredient.scanned_quantity).toFixed(2)} KG</strong></div>
            </div>
            <form onSubmit={handleScanRawMaterialSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Scan Batch Barcode / Serial No</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="e.g. MAT-20260529-SLES-001"
                  value={scanSerialInput} 
                  onChange={e => setScanSerialInput(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setScanModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }}>Verify & Deduct</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAIL MICRO BATCH MODAL */}
      {failModalOpen && failingMicroBatch && (
        <div className="modal-overlay" onClick={() => setFailModalOpen(false)}>
          <div className="modal-content" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ color: '#dc2626' }}>Fail Micro Batch</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setFailModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleFailMicroBatchSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Select Failure Reason</label>
                <select 
                  value={failReason} 
                  onChange={e => setFailReason(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                >
                  <option>Quality issue</option>
                  <option>Wrong mixture</option>
                  <option>Packing issue</option>
                  <option>Other</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setFailModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }}>Confirm Fail</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE MODAL */}
      {barcodeModalOpen && (
        <div className="modal-overlay" onClick={() => setBarcodeModalOpen(null)}>
          <div className="modal-content" style={{ width: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Generated Barcode</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setBarcodeModalOpen(null)}>&times;</button>
            </div>
            
            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', display: 'inline-block', marginBottom: '24px' }}>
              <QRCodeSVG 
                value={barcodeModalOpen.barcode_data} 
                size={160} 
              />
            </div>
            
            <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--primary)', marginBottom: '8px' }}>
              {barcodeModalOpen.barcode_data}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              {productionBatch.product_name} • {barcodeModalOpen.units} Units • Passed
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print
              </button>
              <button className="btn btn-primary" onClick={() => setBarcodeModalOpen(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductionBatchDetail;
