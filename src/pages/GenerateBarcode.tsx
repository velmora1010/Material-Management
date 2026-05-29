import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, Search } from 'lucide-react';
import db from '../db/db';

const GenerateBarcode = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const batches = useLiveQuery(() => db.batches.toArray()) || [];
  const materials = useLiveQuery(() => db.raw_materials.toArray()) || [];
  
  const materialMap = new Map(materials.map(m => [m.id, m]));

  const filteredBatches = batches.filter(b => {
    const mat = materialMap.get(b.material_id);
    const searchString = `${b.batch_id} ${b.vendor_name} ${mat?.name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  }).slice(0, 12); // Limit to 12 for performance while searching

  const downloadQR = (batchId: string) => {
    const svg = document.getElementById(`qr-${batchId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const downloadLink = document.createElement('a');
      downloadLink.download = `${batchId}.png`;
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Generate BarCode</h1>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <Printer size={16} /> Print Visible
        </button>
      </div>

      <div className="page-card" style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search Batch ID, Material, or Vendor..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{ paddingLeft: '48px', height: '48px', fontSize: '16px' }}
          />
        </div>
      </div>

      <div className="grid grid-4">
        {filteredBatches.map((b) => {
          const material = materialMap.get(b.material_id);
          return (
            <div key={b.id} className="page-card" style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <QRCodeSVG id={`qr-${b.batch_id}`} value={JSON.stringify({ batchId: b.batch_id, productId: b.material_id })} size={120} />
                </div>
              </div>
              
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'monospace', marginBottom: '4px' }}>{b.batch_id}</div>
              <div style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '8px' }}>{material?.name}</div>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                <span className="badge badge-neutral">{b.original_quantity} KG</span>
                <span className="badge badge-neutral">{b.vendor_name || 'No Vendor'}</span>
              </div>
              
              <div style={{ marginTop: 'auto' }}>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => downloadQR(b.batch_id)}>
                  <Download size={16} /> Download PNG
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredBatches.length === 0 && (
        <div className="page-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          No batches found matching your search.
        </div>
      )}
    </div>
  );
};

export default GenerateBarcode;
