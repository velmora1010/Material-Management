import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, X } from 'lucide-react';
import db from '../db/db';

const RawMaterials = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', unit: 'KG', category: '', description: '', hsn_code: '', color_code: '#2563eb' });

  const materials = useLiveQuery(
    () => db.raw_materials
      .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.category.toLowerCase().includes(searchTerm.toLowerCase()))
      .toArray(),
    [searchTerm]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.name || !newMaterial.category) return;
    await db.raw_materials.add({ 
      ...newMaterial, 
      created_at: new Date().toISOString() 
    });
    setNewMaterial({ name: '', unit: 'KG', category: '', description: '', hsn_code: '', color_code: '#2563eb' });
    setIsModalOpen(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Raw Materials Master</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search raw materials..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add New Material
          </button>
        </div>
      </div>

      <div className="grid grid-3">
        {materials?.map((material) => (
          <div key={material.id} className="page-card material-card" style={{ padding: '20px' }}>
            <h3 className="material-card-title" style={{ margin: '0 0 16px 0', fontSize: '18px' }}>{material.name}</h3>
            
            <div className="material-card-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>Category:</strong> {material.category}</div>
              <div><strong>Unit:</strong> {material.unit}</div>
              {material.description && <div><strong>Desc:</strong> {material.description}</div>}
              {material.hsn_code && <div><strong>HSN:</strong> <span style={{ fontFamily: 'monospace' }}>{material.hsn_code}</span></div>}
            </div>
          </div>
        ))}
        {materials?.length === 0 && (
          <div className="page-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)' }}>
            No raw materials found. Click "Add New Material" to create one.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Material</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label>Material Name *</label>
                <input required type="text" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="e.g. SLES Paste 70%" />
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Category *</label>
                  <input required type="text" value={newMaterial.category} onChange={e => setNewMaterial({...newMaterial, category: e.target.value})} placeholder="e.g. Surfactant" />
                </div>
                <div className="form-group">
                  <label>Default Unit *</label>
                  <select value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}>
                    <option value="KG">KG</option>
                    <option value="L">Liters</option>
                    <option value="PCS">Pieces</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea value={newMaterial.description} onChange={e => setNewMaterial({...newMaterial, description: e.target.value})} placeholder="Enter material description..." />
              </div>

              <div className="form-group">
                <label>HSN Code</label>
                <input type="text" value={newMaterial.hsn_code} onChange={e => setNewMaterial({...newMaterial, hsn_code: e.target.value})} placeholder="e.g. 3402" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Material</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterials;
