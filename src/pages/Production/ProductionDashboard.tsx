import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseQuery } from '../../hooks/useSupabase';
import { Plus, QrCode, ClipboardList, Factory, Archive, ArrowRight } from 'lucide-react';

const ProductionDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'All' | 'In Progress' | 'Complete'>('All');

  const { data: productionBatches = [], loading } = useSupabaseQuery<any>('production_batches', q => q.order('created_at', { ascending: false }));
  
  if (loading) return <div>Loading...</div>;

  const inProgressCount = productionBatches.filter((b: any) => b.status === 'Prep' || b.status === 'In Progress').length;
  const completedCount = productionBatches.filter((b: any) => b.status === 'Complete').length;
  const totalProduced = productionBatches.reduce((sum: number, b: any) => sum + (b.produced_units || 0), 0);
  const inInventory = productionBatches.reduce((sum: number, b: any) => sum + (b.inventory_units || 0), 0);

  const filteredBatches = productionBatches.filter((b: any) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Complete') return b.status === 'Complete';
    return b.status === 'Prep' || b.status === 'In Progress';
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Production Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Manage production lines and micro batches.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>
            <QrCode size={18} /> Scan
          </button>
          <button className="btn btn-primary" style={{ background: '#f97316', borderColor: '#f97316' }} onClick={() => navigate('/production/new-batch')}>
            <Plus size={18} /> Add Batch
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '32px' }}>
        <div className="page-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Batches Done</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{completedCount}</div>
          </div>
        </div>
        <div className="page-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-soft)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Factory size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{inProgressCount}</div>
          </div>
        </div>
        <div className="page-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-soft)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Archive size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Produced</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalProduced}</div>
          </div>
        </div>
        <div className="page-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-soft)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>In Inventory</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{inInventory}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '2px solid var(--surface-soft)' }}>
        {['All', 'In Progress', 'Complete'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: '0 0 12px 0', 
              fontSize: '15px', 
              fontWeight: 600, 
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            {tab === 'All' ? 'All Batches' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-2">
        {filteredBatches.length === 0 ? (
          <div className="page-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            No batches found in this state.
          </div>
        ) : (
          filteredBatches.map((batch: any) => {
            const progress = batch.total_micro_batches > 0 ? Math.round((batch.completed_micro_batches / batch.total_micro_batches) * 100) : 0;
            const statusColor = batch.status === 'Complete' ? 'var(--success-text)' : batch.status === 'Prep' ? '#f59e0b' : 'var(--primary)';
            
            return (
              <div key={batch.id} className="page-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '18px', margin: 0 }}>{batch.product_name}</h3>
                      <span style={{ 
                        fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px',
                        background: `${statusColor}20`, color: statusColor, textTransform: 'uppercase'
                      }}>
                        {batch.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      ID: {batch.production_batch_id} • {new Date(batch.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Batch Size</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{batch.total_units} Units</div>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-soft)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Micro Batch Progress</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{batch.completed_micro_batches} / {batch.total_micro_batches}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Produced: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{batch.produced_units}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Inventory: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{batch.inventory_units}</strong>
                    </div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => navigate(`/production/batch/${batch.id}`)} style={{ padding: '6px 16px', height: 'auto', fontSize: '13px' }}>
                    Open <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default ProductionDashboard;
