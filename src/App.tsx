import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, Factory, Building2, ShieldCheck, Warehouse, ScanBarcode } from 'lucide-react';
// Removed local database seed

import GlobalHeader from './components/GlobalHeader';
import MobileDepartmentToggle from './components/MobileDepartmentToggle';
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
// IntakeStep4_Success is kept in codebase but not active in routes

import ProductionDashboard from './pages/Production/ProductionDashboard';
import NewProductionBatch from './pages/Production/NewProductionBatch';
import ProductionBatchDetail from './pages/Production/ProductionBatchDetail';

import InventoryRoom from './pages/InventoryRoom';
import ViewBarcode from './pages/ViewBarcode';

const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) => {
  const location = useLocation();
  const routes = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Raw Material', path: '/raw-material', icon: Database },
    { name: 'Production', path: '/production', icon: Factory },
    { name: 'Inventory Room', path: '/inventory-room', icon: Warehouse },
    { name: 'View Barcode', path: '/view-barcode', icon: ScanBarcode }
  ];

  const isModuleActive = (routePath: string) => {
    if (routePath === '/') return location.pathname === '/';
    return location.pathname.startsWith(routePath);
  };

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.body.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      
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
              onClick={() => setIsOpen(false)}
            >
              <Icon strokeWidth={isActive ? 2.5 : 2} />
              <span>{r.name}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* Bottom System Card */}
      <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
        <div style={{ padding: '0 12px 24px 12px' }}>
          <label className="dark-mode-toggle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'pointer' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Dark Mode</span>
            <div className="switch" style={{ margin: 0 }}>
              <input type="checkbox" checked={isDark} onChange={toggleDarkMode} />
              <span className="slider"></span>
            </div>
          </label>
        </div>

        <div style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ShieldCheck size={24} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
          <span style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>ERP System v3.0</span>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            Smart Inventory Management<br/>Made Simple
          </p>
        </div>
      </div>
      
      </aside>
    </>
  );
};

import { supabase } from './lib/supabaseClient';

const cleanupDuplicates = async () => {
  try {
    const { data, error } = await supabase.from('raw_materials').select('id, name, created_at').order('created_at', { ascending: true });
    if (error) throw error;
    
    if (data) {
      const seen = new Set();
      const toDelete: string[] = [];
      for (const item of data) {
        if (seen.has(item.name)) {
          toDelete.push(item.id);
        } else {
          seen.add(item.name);
        }
      }
      
      if (toDelete.length > 0) {
        // Delete individually to avoid potential URL length limits on large IN clauses
        for (const id of toDelete) {
          await supabase.from('raw_materials').delete().eq('id', id);
        }
        console.log(`Cleaned up ${toDelete.length} duplicate materials`);
      }
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
};

const seedDatabase = async () => {
  try {
    const { data: existingData, error } = await supabase.from('raw_materials').select('name');
    if (error) throw error;
    
    const existingNames = new Set(existingData?.map(m => m.name) || []);
    
    const defaultMaterials = [
      { name: 'SLES Paste', unit: 'KG', category: 'Surfactant', color_code: '#2563eb' },
      { name: 'CAPB', unit: 'KG', category: 'Surfactant', color_code: '#10b981' },
      { name: 'Salt', unit: 'KG', category: 'Thickener', color_code: '#64748b' },
      { name: 'AOS', unit: 'KG', category: 'Surfactant', color_code: '#0284c7' },
      { name: 'Fragrance - Lemon Blast', unit: 'KG', category: 'Fragrance', color_code: '#eab308' },
      { name: 'Fragrance - White Flower', unit: 'KG', category: 'Fragrance', color_code: '#fcd34d' },
      { name: 'Fragrance - Milk Saffron', unit: 'KG', category: 'Fragrance', color_code: '#f59e0b' },
      { name: 'Comfort Base', unit: 'KG', category: 'Base', color_code: '#3b82f6' },
      { name: 'Sodium Benzoate', unit: 'KG', category: 'Preservative', color_code: '#ec4899' },
      { name: 'Phenoxy Ethanol', unit: 'KG', category: 'Preservative', color_code: '#d946ef' },
      { name: 'N-Cap', unit: 'KG', category: 'Conditioning Agent', color_code: '#8b5cf6' },
      { name: 'Yellow Colour', unit: 'KG', category: 'Colorant', color_code: '#eab308' },
      { name: 'Blue Colour', unit: 'KG', category: 'Colorant', color_code: '#3b82f6' },
      { name: 'Violet Colour', unit: 'KG', category: 'Colorant', color_code: '#8b5cf6' },
      { name: 'Water', unit: 'KG', category: 'Solvent', color_code: '#0ea5e9' }
    ];

    const toInsert = defaultMaterials.filter(m => !existingNames.has(m.name));
    
    if (toInsert.length > 0) {
      await supabase.from('raw_materials').insert(toInsert);
      console.log(`Seeded ${toInsert.length} new raw materials`);
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
};

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Apply Dark Mode if user previously selected it
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }

    cleanupDuplicates().then(() => {
      seedDatabase().finally(() => {
        setIsReady(true);
      });
    });
  }, []);

  if (!isReady) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 'bold' }}>Loading...</div>;

  return (
    <Router>
      <div className="app-shell">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className="main-content">
          <GlobalHeader toggleSidebar={() => setIsSidebarOpen(true)} />
          <MobileDepartmentToggle />
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
              </Route>
              
              <Route path="/production" element={<ProductionDashboard />} />
              <Route path="/production/new-batch" element={<NewProductionBatch />} />
              <Route path="/production/batch/:id" element={<ProductionBatchDetail />} />
              
              <Route path="/inventory-room" element={<InventoryRoom />} />
              <Route path="/view-barcode" element={<ViewBarcode />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;
