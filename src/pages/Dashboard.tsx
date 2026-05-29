import { useLiveQuery } from 'dexie-react-hooks';

import { Boxes, Factory, Zap, ArrowUpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import db from '../db/db';

const Dashboard = () => {

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

  // Raw Material Data
  const rawMaterials = useLiveQuery(() => db.raw_materials.toArray()) || [];
  const batches = useLiveQuery(() => db.batches.toArray()) || [];
  const inventoryIn = useLiveQuery(() => db.inventory_in.orderBy('id').reverse().limit(5).toArray()) || [];

  // Production Data
  const productionBatches = useLiveQuery(() => db.production_batches.orderBy('id').reverse().toArray()) || [];
  const finishedGoods = useLiveQuery(() => db.finished_goods_inventory.toArray()) || [];

  // --- RAW MATERIAL CALCULATIONS ---
  const activeRmBatches = batches.filter(b => b.status === 'Active' || b.status === 'Low Stock');
  const totalRmStockKg = activeRmBatches.reduce((acc, b) => acc + b.available_quantity, 0);
  const totalRmValue = activeRmBatches.reduce((acc, b) => acc + (b.available_quantity * b.price_per_kg), 0);
  const lowStockCount = batches.filter(b => b.status === 'Low Stock').length;

  // --- PRODUCTION CALCULATIONS ---
  const totalProdBatches = productionBatches.length;
  const inProgressProdBatches = productionBatches.filter(b => b.status === 'In Progress').length;
  const completedProdBatches = productionBatches.filter(b => b.status === 'Complete').length;
  const finishedGoodsUnits = finishedGoods.reduce((acc, item) => acc + item.units, 0);
  const totalProducedUnits = productionBatches.reduce((acc, item) => acc + item.produced_units, 0);
  
  const efficiency = totalProducedUnits > 0 ? Math.round((finishedGoodsUnits / totalProducedUnits) * 100) : 0;

  return (
    <div className="page" style={{ paddingBottom: '64px' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0' }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>System Performance & Analytics</p>
        </div>
        
        <label className="dark-mode-toggle">
          <span>Dark Mode</span>
          <div className="switch">
            <input type="checkbox" checked={isDark} onChange={toggleDarkMode} />
            <span className="slider"></span>
          </div>
        </label>
      </div>

      {/* SECTION 1: RAW MATERIAL SUMMARY */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#3b82f6' }}>
          <Boxes size={20} />
          <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>Raw Material Summary</h2>
        </div>
        <div className="grid grid-4">
          <div className="page-card" style={{ borderTop: '4px solid #3b82f6' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Total Stock</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalRmStockKg.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>KG</span></div>
          </div>
          
          <div className="page-card" style={{ borderTop: '4px solid #3b82f6' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Inventory Value</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{totalRmValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>

          <div className="page-card" style={{ borderTop: '4px solid #3b82f6' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Active Batches</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{activeRmBatches.length}</div>
          </div>

          <div className="page-card" style={{ borderTop: '4px solid #3b82f6', backgroundColor: lowStockCount > 0 ? '#fef2f2' : undefined }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Low Stock</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: lowStockCount > 0 ? '#dc2626' : 'var(--text-primary)' }}>{lowStockCount}</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PRODUCTION SUMMARY */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#10b981' }}>
          <Factory size={20} />
          <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>Production Summary</h2>
        </div>
        <div className="grid grid-4">
          <div className="page-card" style={{ borderTop: '4px solid #10b981' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Total Batches</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalProdBatches}</div>
          </div>
          
          <div className="page-card" style={{ borderTop: '4px solid #10b981' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>In Progress</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{inProgressProdBatches}</div>
          </div>

          <div className="page-card" style={{ borderTop: '4px solid #10b981' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Completed Batches</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{completedProdBatches}</div>
          </div>

          <div className="page-card" style={{ borderTop: '4px solid #10b981' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Finished Goods</span>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{finishedGoodsUnits.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Units</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '24px', marginBottom: '32px' }}>
        {/* SECTION 3: RECENT RAW MATERIAL ACTIVITY */}
        <div className="page-card">
          <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Recent Raw Material Intake</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Material</th>
                  <th style={{ padding: '12px' }}>Vendor</th>
                  <th style={{ padding: '12px' }}>Quantity</th>
                  <th style={{ padding: '12px' }}>Batches</th>
                </tr>
              </thead>
              <tbody>
                {inventoryIn.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No recent intake activity</td></tr>
                ) : inventoryIn.map((item) => {
                  const batchCount = batches.filter(b => b.inventory_in_id === item.id).length;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{new Date(item.date_received).toLocaleDateString()}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{item.material_name}</td>
                      <td style={{ padding: '12px' }}>{item.vendor_name}</td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#3b82f6' }}>{item.quantity_received} KG</td>
                      <td style={{ padding: '12px' }}>{batchCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: RECENT PRODUCTION ACTIVITY */}
        <div className="page-card">
          <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Recent Production Activity</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)', borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Product</th>
                  <th style={{ padding: '12px' }}>Batch ID</th>
                  <th style={{ padding: '12px' }}>Units</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {productionBatches.slice(0,5).length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No recent production activity</td></tr>
                ) : productionBatches.slice(0,5).map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{item.product_name}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{item.production_batch_id}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#10b981' }}>{item.total_units}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase',
                        background: item.status === 'Complete' ? 'var(--success-bg)' : item.status === 'Prep' ? '#fef3c7' : '#eff6ff',
                        color: item.status === 'Complete' ? 'var(--success-text)' : item.status === 'Prep' ? '#d97706' : '#3b82f6'
                      }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 5: QUICK INSIGHTS */}
      <div className="grid grid-2" style={{ gap: '24px' }}>
        <div className="page-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.01) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Zap size={18} color="#3b82f6" />
            <h3 style={{ fontSize: '16px', margin: 0, color: '#3b82f6' }}>Raw Material Status</h3>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Material Categories</span>
              <strong style={{ color: 'var(--text-primary)' }}>{rawMaterials.length}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active Inventory Batches</span>
              <strong style={{ color: 'var(--text-primary)' }}>{activeRmBatches.length}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Capital Tied In Stock</span>
              <strong style={{ color: 'var(--text-primary)' }}>₹{totalRmValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
            </li>
          </ul>
        </div>

        <div className="page-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.01) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ArrowUpCircle size={18} color="#10b981" />
            <h3 style={{ fontSize: '16px', margin: 0, color: '#10b981' }}>Production Status</h3>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Produced Units (Lifetime)</span>
              <strong style={{ color: 'var(--text-primary)' }}>{totalProducedUnits.toLocaleString()}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Finished Goods Inventory</span>
              <strong style={{ color: 'var(--text-primary)' }}>{finishedGoodsUnits.toLocaleString()}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Production Scanned Efficiency</span>
              <strong style={{ color: efficiency >= 100 ? '#10b981' : '#f97316' }}>{efficiency}%</strong>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
