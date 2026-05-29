import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Eye, Boxes } from 'lucide-react';
import db from '../../db/db';

const SavedStockLedger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  
  const [viewDetailsModal, setViewDetailsModal] = useState<any | null>(null);
  const [viewBatchesModal, setViewBatchesModal] = useState<any | null>(null);

  const inventoryRecords = useLiveQuery(() => db.inventory_in.orderBy('id').reverse().toArray()) || [];
  const allBatches = useLiveQuery(() => db.batches.toArray()) || [];



  const filteredRecords = useMemo(() => {
    return inventoryRecords.filter(record => {
      // Search matches
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        record.material_name?.toLowerCase().includes(searchLower) ||
        record.vendor_name?.toLowerCase().includes(searchLower) ||
        record.po_reference?.toLowerCase().includes(searchLower) ||
        // Check if any batch ID matches
        allBatches.some(b => b.inventory_in_id === record.id && (b.serial_number?.toLowerCase().includes(searchLower) || b.batch_id?.toLowerCase().includes(searchLower)));

      // Filter matches
      const matchesMaterial = !filterMaterial || record.material_name === filterMaterial;
      const matchesVendor = !filterVendor || record.vendor_name === filterVendor;

      return matchesSearch && matchesMaterial && matchesVendor;
    });
  }, [inventoryRecords, allBatches, searchTerm, filterMaterial, filterVendor]);

  // Summaries based on filtered records
  const totalRecords = filteredRecords.length;
  const totalValue = filteredRecords.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const filteredBatches = allBatches.filter(b => filteredRecords.some(r => r.id === b.inventory_in_id));
  const totalBatches = filteredBatches.length;

  const uniqueMaterials = Array.from(new Set(inventoryRecords.map(r => r.material_name).filter(Boolean)));
  const uniqueVendors = Array.from(new Set(inventoryRecords.map(r => r.vendor_name).filter(Boolean)));

  const handleViewDetails = (record: any) => setViewDetailsModal(record);
  const handleViewBatches = (record: any) => setViewBatchesModal(record);

  return (
    <div style={{ marginTop: '48px' }}>
      <hr style={{ border: 'none', borderTop: '2px dashed var(--border)', marginBottom: '40px' }} />
      
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h2>View Saved Stock</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3" style={{ marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Records</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalRecords}</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Inventory Value</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)' }}>₹{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Batches</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalBatches}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="page-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-soft)', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search Material, Vendor, PO, Batch ID..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', width: '100%', height: '40px', outline: 'none', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <select 
              value={filterMaterial} 
              onChange={e => setFilterMaterial(e.target.value)}
              style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--text-primary)' }}
            >
              <option value="">All Materials</option>
              {uniqueMaterials.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <select 
              value={filterVendor} 
              onChange={e => setFilterVendor(e.target.value)}
              style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--text-primary)' }}
            >
              <option value="">All Vendors</option>
              {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="page-card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Material Name</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Vendor Name</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Qty Received</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Value</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Batches</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td>
              </tr>
            ) : (
              filteredRecords.map(record => {
                const recordBatches = allBatches.filter(b => b.inventory_in_id === record.id);
                const hasActive = recordBatches.some(b => b.status === 'Active');
                
                return (
                  <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px' }}>{new Date(record.created_at || '').toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{record.material_name}</td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{record.vendor_name}</td>
                    <td style={{ padding: '16px', fontWeight: 500 }}>{record.quantity_received} KG</td>
                    <td style={{ padding: '16px', fontWeight: 500 }}>₹{record.total_amount?.toLocaleString()}</td>
                    <td style={{ padding: '16px' }}>{recordBatches.length} Batches</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        background: hasActive ? 'var(--success-bg)' : 'var(--surface-soft)', 
                        color: hasActive ? 'var(--success-text)' : 'var(--text-secondary)',
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 
                      }}>
                        {hasActive ? 'Active' : 'Depleted'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', height: 'auto', fontSize: '12px' }} onClick={() => handleViewDetails(record)}>
                          <Eye size={14} style={{ marginRight: '4px' }} /> View
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', height: 'auto', fontSize: '12px' }} onClick={() => handleViewBatches(record)}>
                          <Boxes size={14} style={{ marginRight: '4px' }} /> Batches
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View Details Modal */}
      {viewDetailsModal && (
        <div className="modal-overlay" onClick={() => setViewDetailsModal(null)}>
          <div className="modal-content" style={{ width: '600px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Material Details</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>ID: {viewDetailsModal.id}</p>
              </div>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setViewDetailsModal(null)}>&times;</button>
            </div>
            <div className="grid grid-2" style={{ gap: '16px', fontSize: '14px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Material Name</div>
                <div style={{ fontWeight: 600 }}>{viewDetailsModal.material_name}</div>
              </div>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Vendor Name</div>
                <div style={{ fontWeight: 500 }}>{viewDetailsModal.vendor_name || '--'}</div>
              </div>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>PO Reference</div>
                <div style={{ fontWeight: 500 }}>{viewDetailsModal.po_reference || '--'}</div>
              </div>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Received Date</div>
                <div style={{ fontWeight: 500 }}>{viewDetailsModal.date_received || '--'}</div>
              </div>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Quantity Received</div>
                <div style={{ fontWeight: 500 }}>{viewDetailsModal.quantity_received} KG</div>
              </div>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Price Per KG</div>
                <div style={{ fontWeight: 500 }}>₹{viewDetailsModal.price_per_kg?.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>GST %</div>
                <div style={{ fontWeight: 500 }}>{viewDetailsModal.gst_percent}%</div>
              </div>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Base Amount</div>
                <div style={{ fontWeight: 500 }}>₹{viewDetailsModal.base_amount?.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>GST Amount</div>
                <div style={{ fontWeight: 500 }}>₹{viewDetailsModal.gst_amount?.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>Total Amount</div>
                <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{viewDetailsModal.total_amount?.toLocaleString()}</div>
              </div>
              {viewDetailsModal.notes && (
                <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Notes</div>
                  <div style={{ fontWeight: 500 }}>{viewDetailsModal.notes}</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewDetailsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View Batches Modal */}
      {viewBatchesModal && (
        <div className="modal-overlay" onClick={() => setViewBatchesModal(null)}>
          <div className="modal-content" style={{ width: '800px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Generated Batch Details</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>Material: {viewBatchesModal.material_name}</p>
              </div>
              <button style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setViewBatchesModal(null)}>&times;</button>
            </div>
            
            <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Batch No</th>
                    <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Batch ID</th>
                    <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Quantity KG</th>
                    <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Available KG</th>
                    <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>QR Serial</th>
                    <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allBatches.filter(b => b.inventory_in_id === viewBatchesModal.id).map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px' }}>{b.batch_number}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 500 }}>{b.batch_id}</td>
                      <td style={{ padding: '12px' }}>{b.original_quantity} KG</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{b.available_quantity} KG</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{b.serial_number}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          background: b.status === 'Active' ? 'var(--success-bg)' : 'var(--surface-soft)', 
                          color: b.status === 'Active' ? 'var(--success-text)' : 'var(--text-secondary)',
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 
                        }}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewBatchesModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedStockLedger;
