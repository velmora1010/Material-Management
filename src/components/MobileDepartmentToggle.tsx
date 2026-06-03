import { useNavigate, useLocation } from 'react-router-dom';

const MobileDepartmentToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const departments = [
    { name: 'Dashboard', path: '/' },
    { name: 'Raw Material', path: '/raw-material' },
    { name: 'Production', path: '/production' },
    { name: 'Inventory Room', path: '/inventory-room' },
    { name: 'View Barcode', path: '/view-barcode' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="mobile-dept-toggle">
      {departments.map((dept) => (
        <button
          key={dept.path}
          className={`dept-pill ${isActive(dept.path) ? 'active' : ''}`}
          onClick={() => navigate(dept.path)}
        >
          {dept.name}
        </button>
      ))}
    </div>
  );
};

export default MobileDepartmentToggle;
