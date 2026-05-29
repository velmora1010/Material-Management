import { Factory } from 'lucide-react';

const ProductionWorkflow = () => {
  return (
    <div className="page">
      <div className="page-header">
        <h1>Production Workflow</h1>
      </div>

      <div className="page-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ width: '80px', height: '80px', background: 'var(--surface-soft)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: 'var(--primary)' }}>
          <Factory size={40} />
        </div>
        <h2 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Coming Soon</h2>
        <p style={{ fontSize: '16px', maxWidth: '400px' }}>
          Production workflow will be added next. This module will handle batch mixing, formulation tracking, and output packaging.
        </p>
      </div>
    </div>
  );
};

export default ProductionWorkflow;
