import { useState } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';
import { Search, Printer, Download, Eye, X, Scan, CheckCircle } from 'lucide-react';
import Barcode from 'react-barcode';
import { supabase } from '../lib/supabaseClient';

const ViewBarcode = () => {
  const { data: batches = [], loading } = useSupabaseQuery<any>('batches', q => q.not('barcode_data', 'is', null));
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [materialFilter, setMaterialFilter] = useState('All');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [confirmBatch, setConfirmBatch] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState('');

  const uniqueMaterials = Array.from(new Set(batches.map(b => b.material_name)));

  const filteredBatches = batches.filter(b => {
    const matchesSearch = 
      b.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batch_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const bStatus = b.barcode_status || 'Barcode Saved';
    const matchesStatus = statusFilter === 'All' || bStatus === statusFilter;
    const matchesMaterial = materialFilter === 'All' || b.material_name === materialFilter;
    
    return matchesSearch && matchesStatus && matchesMaterial;
  });

  const downloadQR = (serial: string) => {
    const wrapper = document.getElementById(`view-barcode-${serial}`);
    const svg = wrapper?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      const downloadLink = document.createElement('a');
      downloadLink.download = `Barcode-${serial}.png`;
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleConfirmStockIn = async () => {
    if (!confirmBatch) return;
    try {
      const { error } = await supabase.from('batches').update({
        inventory_room_saved: true,
        barcode_status: 'Stock In',
        stock_in_at: new Date().toISOString()
      }).eq('id', confirmBatch.id);

      if (error) throw error;
      
      setToastMessage('Stock added to Inventory Room successfully');
      setConfirmBatch(null);
      setTimeout(() => setToastMessage(''), 3000);
      
      // Update local state temporarily to reflect change without full reload
      const batchIdx = batches.findIndex(b => b.id === confirmBatch.id);
      if (batchIdx >= 0) {
        batches[batchIdx].inventory_room_saved = true;
        batches[batchIdx].barcode_status = 'Stock In';
      }
    } catch (err) {
      console.error('Error confirming stock in:', err);
      alert('Failed to save to Inventory Room.');
    }
  };

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading saved barcodes...</div>;

  return (
    <>
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', background: '#10b981', color: 'white',
          padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, animation: 'slideInRight 0.3s ease-out'
        }}>
          <CheckCircle size={20} />
          <span style={{ fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>View Barcode</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>View all saved raw material barcode labels.</p>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search material, vendor, barcode..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '40px', paddingRight: '12px', height: '40px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
          />
        </div>
        
        <select 
          value={materialFilter} 
          onChange={(e) => setMaterialFilter(e.target.value)}
          style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
        >
          <option value="All">All Materials</option>
          {uniqueMaterials.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
        >
          <option value="All">All Statuses</option>
          <option value="Barcode Saved">Barcode Saved</option>
          <option value="Stock In">Stock In</option>
        </select>
      </div>

      <div className="grid grid-4 print-grid">
        {filteredBatches.map(b => (
          <div key={b.id} className="page-card print-label" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
              <div id={`view-barcode-${b.serial_number}`} style={{ background: 'white', padding: '0px', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-block', maxWidth: '100%' }}>
                <Barcode 
                  value={b.serial_number} 
                  width={1.5}
                  height={40}
                  displayValue={false}
                  margin={10}
                  background="#ffffff"
                  lineColor="#000000"
                />
              </div>
            </div>
            
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--text-primary)', textAlign: 'center' }}>
              {b.material_name}
            </h3>
            
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--primary)', fontFamily: 'monospace', marginBottom: '12px', textAlign: 'center' }}>
              {b.serial_number}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Quantity:</span> <br/><b>{b.original_quantity} KG</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Batch No:</span> <br/><b>{b.batch_number}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Vendor:</span> <br/><b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{b.vendor_name}</b></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <br/><b>{new Date(b.created_at).toISOString().slice(0,10)}</b></div>
            </div>
            
            <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '0 8px', fontSize: '12px', height: '32px' }} onClick={() => setSelectedBatch(b)}>
                  <Eye size={14} /> Details
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '0 8px', fontSize: '12px', height: '32px' }} onClick={() => downloadQR(b.serial_number)}>
                  <Download size={14} /> Label
                </button>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0 8px', fontSize: '12px', height: '32px', background: b.inventory_room_saved ? 'var(--surface-soft)' : '', color: b.inventory_room_saved ? 'var(--text-muted)' : '', border: b.inventory_room_saved ? '1px solid var(--border)' : '' }} 
                onClick={() => {
                  if (b.inventory_room_saved) {
                    alert('This barcode is already added to Inventory Room.');
                  } else {
                    setConfirmBatch(b);
                  }
                }}
              >
                <Scan size={14} /> {b.inventory_room_saved ? 'Already Added' : 'Scan to Inventory'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredBatches.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
          No barcode records found matching your filters.
        </div>
      )}

      {selectedBatch && (
        <div className="modal-overlay" onClick={() => setSelectedBatch(null)}>
          <div className="modal-content" style={{ width: '600px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Barcode Details</h2>
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
                <label>Barcode Number (Serial)</label>
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
                <label>Original Quantity</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.original_quantity} KG</div>
              </div>
              <div className="form-group">
                <label>Available Quantity</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500, color: selectedBatch.available_quantity > 0 ? 'var(--text-primary)' : '#dc2626' }}>
                  {selectedBatch.available_quantity} KG
                </div>
              </div>
              <div className="form-group">
                <label>Vendor</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.vendor_name}</div>
              </div>
              <div className="form-group">
                <label>PO Reference</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.po_reference || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label>Received Date</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{new Date(selectedBatch.created_at).toISOString().slice(0,10)}</div>
              </div>
              <div className="form-group">
                <label>Price Per KG</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>₹{selectedBatch.price_per_kg}</div>
              </div>
              <div className="form-group">
                <label>GST %</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500 }}>{selectedBatch.gst_percent}%</div>
              </div>
              <div className="form-group">
                <label>Batch Value</label>
                <div style={{ padding: '10px', background: 'var(--surface-soft)', borderRadius: '6px', fontWeight: 500, color: 'var(--primary)' }}>₹{selectedBatch.batch_value.toFixed(2)}</div>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Status</label>
                <div style={{ 
                  padding: '10px', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  textAlign: 'center',
                  background: (selectedBatch.barcode_status || 'Barcode Saved') === 'Stock In' ? '#d1fae5' : '#dbeafe',
                  color: (selectedBatch.barcode_status || 'Barcode Saved') === 'Stock In' ? '#065f46' : '#1e40af'
                }}>
                  {selectedBatch.barcode_status || 'Barcode Saved'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              {!selectedBatch.inventory_room_saved && (
                <button className="btn btn-primary" onClick={() => {
                  setConfirmBatch(selectedBatch);
                  setSelectedBatch(null);
                }}>
                  <Scan size={16} /> Scan to Inventory
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => downloadQR(selectedBatch.serial_number)}>
                <Download size={16} /> Download Label
              </button>
              <button className="btn btn-primary" onClick={() => {
                const w = window.open();
                w?.document.write(`
                  <html>
                    <head><title>Print Barcode</title></head>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                      <img src="${document.getElementById(`view-barcode-${selectedBatch.serial_number}`)?.querySelector('canvas')?.toDataURL() || ''}" />
                    </body>
                  </html>
                `);
                setTimeout(() => w?.print(), 500);
              }}>
                <Printer size={16} /> Print Barcode
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBatch && (
        <div className="modal-overlay" onClick={() => setConfirmBatch(null)}>
          <div className="modal-content" style={{ width: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Stock In</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setConfirmBatch(null)}>
                <X size={24} />
              </button>
            </div>
            
            <p style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
              Do you want to add this barcode stock into Inventory Room?
            </p>
            
            <div style={{ background: 'var(--surface-soft)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Material Name</span><strong>{confirmBatch.material_name}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Barcode Number</span><strong>{confirmBatch.serial_number}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Quantity KG</span><strong>{confirmBatch.original_quantity} KG</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Vendor</span><strong>{confirmBatch.vendor_name}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Batch No</span><strong>{confirmBatch.batch_number}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Date</span><strong>{new Date(confirmBatch.created_at).toISOString().slice(0,10)}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmBatch(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmStockIn}>OK, Add to Inventory Room</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewBarcode;
