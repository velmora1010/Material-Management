import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, Factory, Building2, ShieldCheck } from 'lucide-react';
import { seedDatabase } from './db/db';

import GlobalHeader from './components/GlobalHeader';
import Dashboard from './pages/Dashboard';

// Removed RawMaterialModule
import RawMaterials from './pages/RawMaterials';
import StockManagement from './pages/StockManagement';
import GenerateBarcode from './pages/GenerateBarcode';

// Intake Workflow
import IntakeWorkflow from './pages/IntakeWorkflow/IntakeWorkflow';
import IntakeStep1_Form from './pages/IntakeWorkflow/IntakeStep1_Form';
import IntakeStep2_Split from './pages/IntakeWorkflow/IntakeStep2_Split';
import IntakeStep3_Barcode from './pages/IntakeWorkflow/IntakeStep3_Barcode';
import IntakeStep4_Success from './pages/IntakeWorkflow/IntakeStep4_Success';

import ProductionDashboard from './pages/Production/ProductionDashboard';
import NewProductionBatch from './pages/Production/NewProductionBatch';
import ProductionBatchDetail from './pages/Production/ProductionBatchDetail';

const Sidebar = () => {
  const location = useLocation();
  const routes = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Raw Material', path: '/raw-material', icon: Database },
    { name: 'Production', path: '/production', icon: Factory }
  ];

  const isModuleActive = (routePath: string) => {
    if (routePath === '/') return location.pathname === '/';
    return location.pathname.startsWith(routePath);
  };

  return (
    <aside className="sidebar">
      
      {/* Centered Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        <Building2 size={40} style={{ marginBottom: '12px', color: 'var(--primary)' }} />
        <h1 style={{ fontWeight: 'bold', fontSize: '22px', lineHeight: 1.1, margin: 0, fontFamily: 'Inter', color: 'var(--text-primary)' }}>Material<br/>Management</h1>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '8px', marginBottom: 0 }}>ERP System v3.0</p>
      </div>
      
      {/* Navigation Cards */}
      <nav className="nav-list">
        {routes.map(r => {
          const Icon = r.icon;
          const isActive = isModuleActive(r.path);
          return (
            <Link 
              key={r.path} 
              to={r.path} 
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon strokeWidth={isActive ? 2.5 : 2} />
              <span>{r.name}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Bottom System Card */}
      <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
        <div style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ShieldCheck size={24} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
          <span style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>ERP System v3.0</span>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            Smart Inventory Management<br/>Made Simple
          </p>
        </div>
      </div>
      
    </aside>
  );
};

const App = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Apply Dark Mode if user previously selected it
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }

    const initDb = async () => {
      await seedDatabase();
      setIsReady(true);
    };
    initDb();
  }, []);

  if (!isReady) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 'bold' }}>Loading Database...</div>;

  return (
    <Router>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <GlobalHeader />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              
              <Route path="/raw-material/standalone-barcode" element={<GenerateBarcode />} />
              <Route path="/raw-material/master" element={<RawMaterials />} />
              <Route path="/raw-material/batches" element={<StockManagement />} />
              
              <Route element={<IntakeWorkflow />}>
                <Route path="/raw-material" element={<IntakeStep1_Form />} />
                <Route path="/raw-material/split-batches" element={<IntakeStep2_Split />} />
                <Route path="/raw-material/generate-barcode" element={<IntakeStep3_Barcode />} />
                <Route path="/raw-material/confirmation" element={<IntakeStep4_Success />} />
              </Route>
              
              <Route path="/production" element={<ProductionDashboard />} />
              <Route path="/production/new-batch" element={<NewProductionBatch />} />
              <Route path="/production/batch/:id" element={<ProductionBatchDetail />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;
