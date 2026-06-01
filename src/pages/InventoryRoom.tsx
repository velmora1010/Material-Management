import { useState, Component } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';
import { PackageCheck, Boxes, ClipboardCheck, Truck, Search, Eye, Download, Printer, Database, X } from 'lucide-react';

const safeText = (value: any) => String(value ?? '').toLowerCase();

const InventoryRoom = () => {
  const [activeTab, setActiveTab] = useState<'raw_material' | 'production' | 'finished_goods'>('raw_material');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  const { data: rawBatches = [], loading: loadingBatches } = useSupabaseQuery<any>('batches');
  const { data: productionBatches = [], loading: loadingProd } = useSupabaseQuery<any>('production_batches');
  const { data: microBatches = [] } = useSupabaseQuery<any>('production_micro_batches');
  const { data: finishedGoods = [] } = useSupabaseQuery<any>('finished_goods_inventory');

  if (loadingBatches || loadingProd) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 'bold' }}>Loading Inventory Data...</div>;
  }

  // Filter raw batches that have been scanned into inventory
  const scannedRawBatches = rawBatches.filter(b => 
    b.inventory_room_saved === true || 
    b.barcode_status === 'Stock In' ||
    b.status === 'Stock In'
  ).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Summary Calcs
  const totalRawMaterialKG = scannedRawBatches.filter(b => b.status !== 'Depleted').reduce((acc, b) => acc + (b.available_quantity || 0), 0);
  const rawMaterialValue = scannedRawBatches.filter(b => b.status !== 'Depleted').reduce((acc, b) => acc + (b.batch_value || 0), 0);
  const totalProductionUnits = productionBatches.reduce((acc, b) => acc + (b.total_units || 0), 0);
  const finishedGoodsAvailable = finishedGoods.filter(f => f.status === 'In Stock').reduce((acc, f) => acc + (f.units || 0), 0);
  const totalBatchesCount = scannedRawBatches.length + productionBatches.length;
  const readyForDispatch = finishedGoodsAvailable;

  // Enriched Data
  const q = safeText(searchTerm);

  const filteredRaw = scannedRawBatches.filter(item => 
    safeText(item.material_name).includes(q) || 
    safeText(item.vendor_name).includes(q) ||
    safeText(item.po_reference).includes(q) ||
    safeText(item.serial_number).includes(q) ||
    safeText(item.batch_number).includes(q)
  );

  const filteredProd = productionBatches.filter(item => 
    safeText(item.product_name).includes(q) || 
    safeText(item.production_batch_id).includes(q)
  ).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
   .map(pb => {
    const mbs = microBatches.filter(m => m.production_batch_id === pb.production_batch_id);
    const passed = mbs.filter(m => m.status === 'Passed').length;
    const failed = mbs.filter(m => m.status === 'Failed').length;
    return { ...pb, passed, failed };
  });

  const filteredFinished = finishedGoods.filter(item => 
    safeText(item.product_name).includes(q) || 
    safeText(item.barcode_data).includes(q)
  ).sort((a,b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());

  const defaultMaterials = [
    'SLES Paste', 'CAPB', 'Salt', 'AOS', 'Fragrance - Lemon Blast',
    'Fragrance - White Flower', 'Fragrance - Milk Saffron', 'Comfort Base',
    'Sodium Benzoate', 'Phenoxy Ethanol', 'N-Cap', 'Yellow Colour',
    'Blue Colour', 'Violet Colour', 'Water'
  ];

  const overviewCards = defaultMaterials.map(mat => {
    const batches = scannedRawBatches.filter(b => b.material_name === mat);
    const totalBatches = batches.length;
    const totalKG = batches.reduce((sum, b) => sum + (b.original_quantity || 0), 0);
    const availableKG = batches.reduce((sum, b) => sum + (b.available_quantity ?? b.original_quantity ?? 0), 0);
    const usedKG = totalKG - availableKG;
    const amount = batches.reduce((sum, b) => sum + (b.batch_value || ((b.original_quantity || 0) * (b.price_per_kg || 0))), 0);
    
    let accentColor = 'var(--primary)';
    let accentBg = 'var(--surface-soft)';
    let shortCode = mat.substring(0, 3).toUpperCase();
    
    if (mat.includes('SLES')) { accentColor = '#3b82f6'; accentBg = 'rgba(59, 130, 246, 0.1)'; shortCode = '1B, 1Y'; }
    if (mat.includes('CAPB')) { accentColor = '#0d9488'; accentBg = 'rgba(13, 148, 136, 0.1)'; shortCode = '2C'; }
    if (mat.includes('Salt')) { accentColor = '#eab308'; accentBg = 'rgba(234, 179, 8, 0.1)'; shortCode = '3S'; }
    if (mat.includes('AOS')) { accentColor = '#a855f7'; accentBg = 'rgba(168, 85, 247, 0.1)'; shortCode = '4A'; }
    if (mat.includes('Lemon')) { accentColor = '#22c55e'; accentBg = 'rgba(34, 197, 94, 0.1)'; shortCode = 'FL'; }
    if (mat.includes('White')) { accentColor = '#14b8a6'; accentBg = 'rgba(20, 184, 166, 0.1)'; shortCode = 'FW'; }
    if (mat.includes('Saffron')) { accentColor = '#10b981'; accentBg = 'rgba(16, 185, 129, 0.1)'; shortCode = 'FM'; }
    if (mat.includes('Comfort')) { accentColor = '#f97316'; accentBg = 'rgba(249, 115, 22, 0.1)'; shortCode = 'CB'; }

    return { name: mat, totalKG, availableKG, usedKG, amount, totalBatches, accentColor, accentBg, shortCode };
  });

  const filteredOverviewCards = q ? overviewCards.filter(card => safeText(card.name).includes(q) || safeText(card.shortCode).includes(q)) : overviewCards;

  return (
    <div className="page" style={{ paddingBottom: '64px' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0' }}>Inventory Overview</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Central overview of raw material stock, production stock, finished goods, and inventory records.</p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-3" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <div className="page-card" style={{ gridColumn: 'span 2', borderTop: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Database size={16} color="#8b5cf6" />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Total Raw Material KG</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalRawMaterialKG.toLocaleString(undefined, { maximumFractionDigits: 1 })} KG</div>
        </div>
        
        <div className="page-card" style={{ gridColumn: 'span 2', borderTop: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ClipboardCheck size={16} color="#3b82f6" />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Raw Material Value</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{rawMaterialValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>

        <div className="page-card" style={{ gridColumn: 'span 2', borderTop: '4px solid #f97316', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Boxes size={16} color="#f97316" />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Total Prod Units</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalProductionUnits.toLocaleString()}</div>
        </div>

        <div className="page-card" style={{ gridColumn: 'span 2', borderTop: '4px solid #10b981', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <PackageCheck size={16} color="#10b981" />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Finished Goods Available</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{finishedGoodsAvailable.toLocaleString()}</div>
        </div>

        <div className="page-card" style={{ gridColumn: 'span 2', borderTop: '4px solid #64748b', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Boxes size={16} color="#64748b" />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Total Batches</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalBatchesCount.toLocaleString()}</div>
        </div>

        <div className="page-card" style={{ gridColumn: 'span 2', borderTop: '4px solid #eab308', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Truck size={16} color="#eab308" />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Ready for Dispatch</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{readyForDispatch.toLocaleString()}</div>
        </div>
      </div>

      {/* RAW MATERIAL OVERVIEW SECTION */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', margin: '0 0 4px 0' }}>Raw Material Overview</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Product-wise raw material stock, available quantity, used quantity, amount, and batch count.</p>
        </div>
        
        <div className="grid grid-4">
          {filteredOverviewCards.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No records found.<br/><span style={{ fontSize: '13px' }}>Try another material name, vendor, barcode, or PO number.</span>
            </div>
          ) : (
            filteredOverviewCards.map(card => (
              <div key={card.name} className="page-card" style={{ 
              padding: '16px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px',
              borderTop: `4px solid ${card.accentColor}`, background: 'var(--surface)'
            }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ padding: '8px', background: card.accentBg, borderRadius: '10px', height: 'fit-content' }}>
                    <Database size={20} color={card.accentColor} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>{card.name}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{card.shortCode}</div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: '1.2' }}>{card.totalKG.toFixed(1)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>kg in stock</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
                <div style={{ padding: '8px 10px', background: 'var(--surface-soft)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#10b981' }}>{card.availableKG.toFixed(1)}kg</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Available</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--surface-soft)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ef4444' }}>{card.usedKG.toFixed(1)}kg</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Used</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--surface-soft)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#3b82f6' }}>₹{card.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Amount</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--surface-soft)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#8b5cf6' }}>{card.totalBatches}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Batch</div>
                </div>
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* SEARCH AND TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-soft)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <button 
            className={`btn ${activeTab === 'raw_material' ? 'btn-primary' : 'btn-secondary'}`} 
            style={activeTab === 'raw_material' ? {} : { border: 'none', background: 'transparent' }}
            onClick={() => setActiveTab('raw_material')}
          >
            Raw Material Stock
          </button>
          <button 
            className={`btn ${activeTab === 'production' ? 'btn-primary' : 'btn-secondary'}`} 
            style={activeTab === 'production' ? {} : { border: 'none', background: 'transparent' }}
            onClick={() => setActiveTab('production')}
          >
            Production Stock
          </button>
          <button 
            className={`btn ${activeTab === 'finished_goods' ? 'btn-primary' : 'btn-secondary'}`} 
            style={activeTab === 'finished_goods' ? {} : { border: 'none', background: 'transparent' }}
            onClick={() => setActiveTab('finished_goods')}
          >
            Finished Goods Inventory
          </button>
        </div>

        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Global Search..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      {/* DATA TABLES */}
      <div className="page-card" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* RAW MATERIAL TAB */}
        {activeTab === 'raw_material' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Scanned Date</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Material Name</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Barcode No</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Batch No</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Vendor Name</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>PO / Bill No</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Quantity KG</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Available KG</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Total Value</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRaw.length === 0 ? (
                  <tr><td colSpan={11} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.<br/><span style={{ fontSize: '13px' }}>Try another material name, vendor, barcode, or PO number.</span></td></tr>
                ) : (
                  filteredRaw.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px' }}>{new Date(row.stock_in_at || row.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.material_name}</td>
                      <td style={{ padding: '16px', fontFamily: 'monospace' }}>{row.serial_number}</td>
                      <td style={{ padding: '16px' }}>{row.batch_number}</td>
                      <td style={{ padding: '16px' }}>{row.vendor_name || '--'}</td>
                      <td style={{ padding: '16px' }}>{row.po_reference || '--'}</td>
                      <td style={{ padding: '16px' }}>{row.original_quantity} KG</td>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{row.available_quantity?.toFixed(1) ?? row.original_quantity} KG</td>
                      <td style={{ padding: '16px', fontWeight: 500 }}>₹{row.batch_value?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? 0}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                          background: 'var(--success-bg)',
                          color: 'var(--success-text)'
                        }}>
                          Stock In
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }}
                          onClick={() => setSelectedBatch(row)}
                        >
                          <Eye size={14}/>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PRODUCTION STOCK TAB */}
        {activeTab === 'production' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Product Name</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Batch ID</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Total Units</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Produced Units</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Passed MB</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Failed MB</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProd.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.<br/><span style={{ fontSize: '13px' }}>Try another material name, vendor, barcode, or PO number.</span></td></tr>
                ) : (
                  filteredProd.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px' }}>{new Date(row.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.product_name}</td>
                      <td style={{ padding: '16px', fontFamily: 'monospace' }}>{row.production_batch_id}</td>
                      <td style={{ padding: '16px' }}>{row.total_units}</td>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{row.produced_units}</td>
                      <td style={{ padding: '16px', color: 'var(--success-text)', fontWeight: 600 }}>{row.passed}</td>
                      <td style={{ padding: '16px', color: '#dc2626', fontWeight: 600 }}>{row.failed}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                          background: row.status === 'Saved' || row.status === 'Complete' ? 'var(--success-bg)' : 'var(--surface-soft)',
                          color: row.status === 'Saved' || row.status === 'Complete' ? 'var(--success-text)' : 'var(--text-secondary)'
                        }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }}><Eye size={14}/></button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }}><Boxes size={14}/></button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }}><Printer size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* FINISHED GOODS INVENTORY TAB */}
        {activeTab === 'finished_goods' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Date Scanned</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Product Name</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Batch Reference</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Units</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Barcode / QR</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFinished.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.<br/><span style={{ fontSize: '13px' }}>Try another material name, vendor, barcode, or PO number.</span></td></tr>
                ) : (
                  filteredFinished.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px' }}>{new Date(row.scanned_at).toLocaleDateString()} {new Date(row.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.product_name}</td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{row.production_batch_id}</td>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{row.units} Units</td>
                      <td style={{ padding: '16px', fontFamily: 'monospace' }}>{row.barcode_data}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                          background: row.status === 'In Stock' ? '#ecfeff' : 'var(--surface-soft)',
                          color: row.status === 'In Stock' ? '#0891b2' : 'var(--text-secondary)'
                        }}>
                          {row.status === 'In Stock' ? 'Ready' : row.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }}><Eye size={14}/></button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }}><Printer size={14}/></button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }}><Download size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {selectedBatch && (
        <div className="modal-overlay" onClick={() => setSelectedBatch(null)}>
          <div className="modal-content" style={{ width: '600px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Raw Material Stock Details</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelectedBatch(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Material Name</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.material_name}</div>
              </div>
              <div className="form-group">
                <label>Barcode Number</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500, fontFamily: 'monospace' }}>{selectedBatch.serial_number}</div>
              </div>
              <div className="form-group">
                <label>Batch ID</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500, fontFamily: 'monospace', fontSize: '12px' }}>{selectedBatch.batch_id}</div>
              </div>
              <div className="form-group">
                <label>Batch Number</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.batch_number}</div>
              </div>
              <div className="form-group">
                <label>Quantity KG</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.original_quantity} KG</div>
              </div>
              <div className="form-group">
                <label>Available KG</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500, color: selectedBatch.available_quantity > 0 ? 'var(--text-primary)' : '#dc2626' }}>
                  {selectedBatch.available_quantity ?? selectedBatch.original_quantity} KG
                </div>
              </div>
              <div className="form-group">
                <label>Vendor</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.vendor_name || '--'}</div>
              </div>
              <div className="form-group">
                <label>PO Reference</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.po_reference || '--'}</div>
              </div>
              <div className="form-group">
                <label>Received Date</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{new Date(selectedBatch.created_at).toISOString().slice(0,10)}</div>
              </div>
              <div className="form-group">
                <label>Stock In Date</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.stock_in_at ? new Date(selectedBatch.stock_in_at).toISOString().slice(0,10) : new Date(selectedBatch.created_at).toISOString().slice(0,10)}</div>
              </div>
              <div className="form-group">
                <label>Price Per KG</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>₹{selectedBatch.price_per_kg || 0}</div>
              </div>
              <div className="form-group">
                <label>GST %</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.gst_percent || 0}%</div>
              </div>
              <div className="form-group">
                <label>Batch Value</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500, color: 'var(--primary)' }}>₹{selectedBatch.batch_value?.toFixed(2) || 0}</div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <div style={{ 
                  padding: '10px', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  textAlign: 'center',
                  background: '#d1fae5',
                  color: '#065f46',
                  border: `1px solid #34d399`
                }}>
                  Stock In
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedBatch(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

class ErrorBoundary extends Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Something went wrong while loading Inventory Room.</h2>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Clear Search</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function InventoryRoomWrapper() {
  return (
    <ErrorBoundary>
      <InventoryRoom />
    </ErrorBoundary>
  );
}
