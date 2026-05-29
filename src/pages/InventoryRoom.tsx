import { PackageCheck, Boxes, ClipboardCheck, Truck } from 'lucide-react';

const InventoryRoom = () => {
  return (
    <div className="page" style={{ paddingBottom: '64px' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0' }}>Inventory Room</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage finished goods stock and scanned production inventory.</p>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '32px' }}>
        <div className="page-card" style={{ borderTop: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <PackageCheck size={16} color="#8b5cf6" />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Total Finished Goods</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>--</div>
        </div>
        
        <div className="page-card" style={{ borderTop: '4px solid #10b981', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Boxes size={16} color="#10b981" />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Available Units</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>--</div>
        </div>

        <div className="page-card" style={{ borderTop: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ClipboardCheck size={16} color="#3b82f6" />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Scanned Batches</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>--</div>
        </div>

        <div className="page-card" style={{ borderTop: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Truck size={16} color="#f59e0b" />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>Ready for Dispatch</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>--</div>
        </div>
      </div>

      <div className="page-card">
        <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '16px' }}>Inventory Room Workflow (Coming Soon)</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
          This module is currently under construction. The final Inventory Room workflow will include:
        </p>
        <ul style={{ color: 'var(--text-muted)', lineHeight: '1.8', marginLeft: '20px', marginTop: '12px' }}>
          <li>Finished goods stock tracking</li>
          <li>Scanned production batches management</li>
          <li>Product-wise inventory grouping</li>
          <li>Dispatch-ready stock preparation</li>
          <li>Barcode search and validation</li>
        </ul>
      </div>
    </div>
  );
};

export default InventoryRoom;
