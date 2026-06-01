import { useState } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabase';
import { Search, Printer, Download, Eye, X, Copy, Filter } from 'lucide-react';
import Barcode from 'react-barcode';

const ViewBarcode = () => {
  const { data: batches = [], loading } = useSupabaseQuery<any>('batches', q => q.not('barcode_data', 'is', null));
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [materialFilter, setMaterialFilter] = useState('All');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const uniqueMaterials = Array.from(new Set(batches.map(b => b.material_name)));

  const filteredBatches = batches.filter(b => {
    const matchesSearch = 
      b.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batch_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isScanned = b.inventory_room_saved === true || b.barcode_status === 'Stock In';
    const isInspected = !b.inventory_room_saved || b.barcode_status === 'Barcode Saved';
    
    let matchesStatus = true;
    if (statusFilter === 'Not Scanned') matchesStatus = isInspected;
    if (statusFilter === 'Scanned') matchesStatus = isScanned;

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

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading saved barcodes...</div>;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>View Barcode</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>View all saved raw material barcode labels.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
          >
            <Filter size={18} />
            <span style={{ fontWeight: 500 }}>Filter: {statusFilter}</span>
          </button>
          
          {isFilterMenuOpen && (
            <div style={{ 
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, 
              background: 'var(--surface)', border: '1px solid var(--border)', 
              borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
              zIndex: 50, minWidth: '160px', overflow: 'hidden'
            }}>
              {['All', 'Not Scanned', 'Scanned'].map(opt => (
                <div 
                  key={opt}
                  onClick={() => { setStatusFilter(opt); setIsFilterMenuOpen(false); }}
                  style={{ 
                    padding: '10px 16px', cursor: 'pointer', fontSize: '14px',
                    background: statusFilter === opt ? 'var(--surface-soft)' : 'transparent',
                    color: statusFilter === opt ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: statusFilter === opt ? 600 : 400
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = statusFilter === opt ? 'var(--surface-soft)' : 'transparent'}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
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
      </div>

      <div className="grid grid-4 print-grid">
        {filteredBatches.map(b => {
          const isScannedBadge = b.inventory_room_saved === true || b.barcode_status === 'Stock In';
          
          return (
          <div key={b.id} className="page-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div id={`view-barcode-${b.serial_number}`} style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <Barcode 
                value={b.serial_number} 
                width={1.5} 
                height={50} 
                displayValue={false} 
                margin={0} 
                background="#ffffff" 
                lineColor="#000000" 
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Material</span>
                <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{b.material_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Barcode No.</span>
                <strong style={{ fontFamily: 'monospace' }}>{b.serial_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Quantity</span>
                <strong>{b.original_quantity} KG</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vendor</span>
                <strong style={{ textAlign: 'right' }}>{b.vendor_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date</span>
                <strong>{new Date(b.created_at).toLocaleDateString()}</strong>
              </div>
              
              <div style={{ 
                marginTop: '8px', padding: '8px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px',
                background: isScannedBadge ? '#d1fae5' : '#fef08a',
                color: isScannedBadge ? '#065f46' : '#854d0e',
                border: `1px solid ${isScannedBadge ? '#34d399' : '#facc15'}`
              }}>
                {isScannedBadge ? 'Scanned' : 'Not Scanned'}
              </div>
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
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '0 8px', fontSize: '12px', height: '32px', border: '1px dashed var(--border)' }} 
                onClick={() => {
                  navigator.clipboard.writeText(b.serial_number);
                  alert('Barcode copied to clipboard: ' + b.serial_number);
                }}
              >
                <Copy size={14} /> Copy Barcode
              </button>
            </div>
          </div>
        )})}
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
                <label>Barcode Result</label>
                <div style={{ 
                  padding: '10px', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  textAlign: 'center',
                  background: (selectedBatch.inventory_room_saved === true || selectedBatch.barcode_status === 'Stock In') ? '#d1fae5' : '#fef08a',
                  color: (selectedBatch.inventory_room_saved === true || selectedBatch.barcode_status === 'Stock In') ? '#065f46' : '#854d0e',
                  border: `1px solid ${(selectedBatch.inventory_room_saved === true || selectedBatch.barcode_status === 'Stock In') ? '#34d399' : '#facc15'}`
                }}>
                  {(selectedBatch.inventory_room_saved === true || selectedBatch.barcode_status === 'Stock In') ? 'Scanned' : 'Not Scanned'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
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
    </>
  );
};

export default ViewBarcode;
