import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PackageCheck, Boxes, ClipboardCheck, Truck, Search, Eye, Download, Printer, Database } from 'lucide-react';
import db from '../db/db';

const InventoryRoom = () => {
  const [activeTab, setActiveTab] = useState<'raw_material' | 'production' | 'finished_goods'>('raw_material');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Data
  const inventoryIn = useLiveQuery(() => db.inventory_in.toArray()) || [];
  const rawBatches = useLiveQuery(() => db.batches.toArray()) || [];
  const productionBatches = useLiveQuery(() => db.production_batches.toArray()) || [];
  const microBatches = useLiveQuery(() => db.production_micro_batches.toArray()) || [];
  const finishedGoods = useLiveQuery(() => db.finished_goods_inventory.toArray()) || [];

  // Summary Calcs
  const totalRawMaterialKG = rawBatches.filter(b => b.status !== 'Depleted').reduce((acc, b) => acc + (b.available_quantity || 0), 0);
  const rawMaterialValue = rawBatches.filter(b => b.status !== 'Depleted').reduce((acc, b) => acc + (b.batch_value || 0), 0);
  const totalProductionUnits = productionBatches.reduce((acc, b) => acc + (b.total_units || 0), 0);
  const finishedGoodsAvailable = finishedGoods.filter(f => f.status === 'In Stock').reduce((acc, f) => acc + (f.units || 0), 0);
  const totalBatchesCount = rawBatches.length + productionBatches.length;
  const readyForDispatch = finishedGoodsAvailable;

  // Enriched Data
  const filteredRaw = inventoryIn.filter(item => 
    item.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.po_reference?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
   .map(inv => {
    const bts = rawBatches.filter(b => b.inventory_in_id === inv.id);
    const available = bts.reduce((sum, b) => sum + (b.available_quantity || 0), 0);
    const numBatches = bts.length;
    const value = bts.reduce((sum, b) => sum + (b.batch_value || 0), 0);
    const status = available <= 0 ? 'Depleted' : available < (inv.quantity_received * 0.2) ? 'Low Stock' : 'Active';
    return { ...inv, available, numBatches, value, status };
  });

  const filteredProd = productionBatches.filter(item => 
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.production_batch_id?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
   .map(pb => {
    const mbs = microBatches.filter(m => m.production_batch_id === pb.production_batch_id);
    const passed = mbs.filter(m => m.status === 'Passed').length;
    const failed = mbs.filter(m => m.status === 'Failed').length;
    return { ...pb, passed, failed };
  });

  const filteredFinished = finishedGoods.filter(item => 
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.barcode_data?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());

  return (
    <div className="page" style={{ paddingBottom: '64px' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0' }}>Inventory Room</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Central ledger for all saved stock and production records.</p>
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
                  <th style={{ padding: '16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Material Name</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Vendor Name</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>PO / Bill No</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Total Received</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Available KG</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Batches</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Total Value</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRaw.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td></tr>
                ) : (
                  filteredRaw.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '16px' }}>{new Date(row.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.material_name}</td>
                      <td style={{ padding: '16px' }}>{row.vendor_name || '--'}</td>
                      <td style={{ padding: '16px' }}>{row.po_reference || '--'}</td>
                      <td style={{ padding: '16px' }}>{row.quantity_received} KG</td>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{row.available.toFixed(1)} KG</td>
                      <td style={{ padding: '16px' }}>{row.numBatches}</td>
                      <td style={{ padding: '16px', fontWeight: 500 }}>₹{row.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                          background: row.status === 'Active' ? 'var(--success-bg)' : row.status === 'Low Stock' ? '#fef3c7' : '#fef2f2',
                          color: row.status === 'Active' ? 'var(--success-text)' : row.status === 'Low Stock' ? '#d97706' : '#dc2626'
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
                  <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No production records found.</td></tr>
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
                  <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No finished goods inventory found.</td></tr>
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
    </div>
  );
};

export default InventoryRoom;
