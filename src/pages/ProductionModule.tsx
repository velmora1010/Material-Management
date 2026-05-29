import { useNavigate } from 'react-router-dom';
import { PackageMinus, Factory, ChevronRight } from 'lucide-react';

const ProductionModule = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Raw Material Issue',
      description: 'Issue raw materials from batches to production',
      icon: PackageMinus,
      path: '/production/raw-material-issue'
    },
    {
      title: 'Production Workflow',
      description: 'Placeholder for next workflow',
      icon: Factory,
      path: '/production/workflow'
    }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Production Department</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px' }}>
            Manage raw material issuing and production workflows.
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className="page-card module-card" 
              onClick={() => navigate(card.path)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '20px', 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(37, 99, 235, 0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(15, 23, 42, 0.06)';
              }}
            >
              <div style={{
                width: '64px', 
                height: '64px', 
                borderRadius: '16px', 
                background: 'var(--surface-soft)', 
                color: 'var(--primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={32} strokeWidth={2} />
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--text-primary)' }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{card.description}</p>
              </div>

              <div style={{ color: 'var(--text-muted)' }}>
                <ChevronRight size={24} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductionModule;
