import { useNavigate } from 'react-router-dom';
import { useIntakeContext } from './IntakeContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2, Home, PackagePlus, Boxes, Printer, Download } from 'lucide-react';
import db from '../../db/db';

const IntakeStep4_Success = () => {
  const navigate = useNavigate();
  const { clearIntakeSession } = useIntakeContext();

  // Load the most recently added inventory_in record
  const latestInventory = useLiveQuery(async () => {
    const records = await db.inventory_in.orderBy('id').reverse().limit(1).toArray();
    return records[0] || null;
  });

  // Load all batches associated with the latest inventory record
  const savedBatches = useLiveQuery(async () => {
    if (!latestInventory?.id) return [];
    return await db.batches.where('inventory_in_id').equals(latestInventory.id).toArray();
  }, [latestInventory?.id]);

  const handleFinish = (path: string) => {
    clearIntakeSession();
    navigate(path);
  };

  if (latestInventory === undefined || savedBatches === undefined) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading saved records...</div>;
  }

  if (latestInventory === null) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No recent inventory records found.</p>
        <button className="btn btn-primary" onClick={() => handleFinish('/raw-material')}>Go to Intake</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* 1. Success Message Section */}
      <div className="page-card" style={{ textAlign: 'center', padding: '40px 20px', marginTop: '24px', marginBottom: '24px' }}>
        <CheckCircle2 size={64} style={{ color: 'var(--success-text)', margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '28px', margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Stock Saved Successfully!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '16px' }}>
          Inventory has been recorded and <b>{savedBatches.length} batches</b> have been generated for <b>{latestInventory.material_name}</b>.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--surface-soft)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border)', minWidth: '140px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Total Received</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>{latestInventory.quantity_received} KG</div>
          </div>
          <div style={{ background: 'var(--surface-soft)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border)', minWidth: '140px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Total Value</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{latestInventory.total_amount?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div style={{ background: 'var(--surface-soft)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border)', minWidth: '140px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Batches Created</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{savedBatches.length}</div>
          </div>
        </div>
      </div>

      {/* 2. Saved Stock Details Card */}
      <div className="page-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', margin: '0 0 20px 0', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          Saved Stock Details
        </h3>
        
        <div className="grid grid-2" style={{ gap: '16px', fontSize: '14px' }}>
          <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Material Name</div>
            <div style={{ fontWeight: 600 }}>{latestInventory.material_name}</div>
          </div>
          <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Vendor Name</div>
            <div style={{ fontWeight: 500 }}>{latestInventory.vendor_name || '--'}</div>
          </div>
          <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>PO Reference / Bill No</div>
            <div style={{ fontWeight: 500 }}>{latestInventory.po_reference || '--'}</div>
          </div>
          <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Received Date</div>
            <div style={{ fontWeight: 500 }}>{latestInventory.date_received || '--'}</div>
          </div>
          <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Quantity Received</div>
            <div style={{ fontWeight: 500 }}>{latestInventory.quantity_received} KG</div>
          </div>
          <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Price Per KG</div>
            <div style={{ fontWeight: 500 }}>₹{latestInventory.price_per_kg?.toFixed(2)}</div>
          </div>
          <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>GST %</div>
            <div style={{ fontWeight: 500 }}>{latestInventory.gst_percent}%</div>
          </div>
          <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px', display: 'flex', gap: '20px' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Base Amount</div>
              <div style={{ fontWeight: 500 }}>₹{latestInventory.base_amount?.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>GST Amount</div>
              <div style={{ fontWeight: 500 }}>₹{latestInventory.gst_amount?.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>Total Amount</div>
              <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{latestInventory.total_amount?.toLocaleString()}</div>
            </div>
          </div>
          {latestInventory.notes && (
            <div style={{ background: 'var(--surface-soft)', padding: '12px', borderRadius: '8px', gridColumn: '1 / -1' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>Notes</div>
              <div style={{ fontWeight: 500 }}>{latestInventory.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Batch Details Section */}
      <div className="page-card" style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', margin: '0 0 20px 0', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          Generated Batch Details
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Batch No</th>
                <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Batch ID / Serial No</th>
                <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Quantity KG</th>
                <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Available KG</th>
                <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Barcode / QR No</th>
                <th style={{ padding: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {savedBatches.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px' }}>Batch {b.batch_number}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 500 }}>{b.batch_id} <br/><span style={{ color: 'var(--primary)', fontSize: '12px' }}>{b.serial_number}</span></td>
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
      </div>

      {/* 4. Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => handleFinish('/')} style={{ padding: '0 24px', height: '48px' }}>
          <Home size={18} /> Home
        </button>
        <button className="btn btn-primary" onClick={() => handleFinish('/raw-material')} style={{ padding: '0 24px', height: '48px' }}>
          <PackagePlus size={18} /> Receive Another Material
        </button>
        <button className="btn btn-secondary" onClick={() => handleFinish('/raw-material/batches')} style={{ padding: '0 24px', height: '48px' }}>
          <Boxes size={18} /> View Batches
        </button>
        <button className="btn btn-secondary" onClick={() => window.print()} style={{ padding: '0 24px', height: '48px' }}>
          <Printer size={18} /> Print Saved Details
        </button>
        <button className="btn btn-secondary" onClick={() => window.print()} style={{ padding: '0 24px', height: '48px' }}>
          <Download size={18} /> Download PDF
        </button>
      </div>

    </div>
  );
};

export default IntakeStep4_Success;
