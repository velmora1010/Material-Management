import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Bell, MapPin, UserCircle2 } from 'lucide-react';
import GlobalScanner from './GlobalScanner';

const GlobalHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard Overview';
      case '/raw-material': return 'Step 1: Intake Form';
      case '/raw-material/split-batches': return 'Step 2: Split Batches';
      case '/raw-material/generate-barcode': return 'Step 3: Generate Labels';
      case '/raw-material/confirmation': return 'Step 4: Save to Stock';
      case '/raw-material/batches': return 'Saved Batches';
      case '/raw-material/standalone-barcode': return 'Generate Barcode Utility';
      case '/production': return 'Production Department';
      case '/production/raw-material-issue': return 'Raw Material Issue';
      case '/production/workflow': return 'Production Workflow';
      default: return 'System View';
    }
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="header-actions">
          <button 
            onClick={() => navigate('/')} 
            className="icon-btn"
            title="Go to Dashboard"
          >
            <Home size={18} strokeWidth={2.2} />
          </button>
          
          <button 
            onClick={() => navigate(-1)} 
            className="icon-btn"
            title="Go Back"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
        </div>
        
        <div style={{ height: '24px', width: '1px', background: 'var(--border)', marginRight: '20px' }}></div>
        
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{getTitle()}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <GlobalScanner />
        
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <Bell size={20} />
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--surface)' }}></span>
        </button>
        
        <div style={{ height: '32px', width: '1px', background: 'var(--border)' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'right' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Warehouse Admin</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', justifyContent: 'flex-end' }}>
              <MapPin size={12} />
              <span>Main Facility</span>
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', background: 'var(--surface-soft)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCircle2 size={24} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
