import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, Wallet, Settings, Zap, User } from 'lucide-react';
import { useUser } from '../context/UserContext';

const SidebarItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-primary text-white shadow-lg shadow-primary/20'
            : 'text-text-secondary hover:bg-surface-lighter hover:text-white'
        }`
      }
    >
      <Icon size={22} className="shrink-0" />
      <span className="hidden lg:block text-sm font-medium">{label}</span>
    </NavLink>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  
  return (
    <div className="flex h-screen w-full bg-bg-dark overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 lg:w-64 flex-shrink-0 flex flex-col justify-between border-r border-border-dark bg-[#101723] z-50">
        <div className="flex flex-col gap-6 p-3 lg:p-4">
          {/* Brand */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary shadow-lg shadow-primary/20 shrink-0">
              <Zap className="text-white fill-white" size={20} />
            </div>
            <div className="hidden lg:flex flex-col">
              <h1 className="text-white text-base font-bold font-display leading-tight">SmartCharge</h1>
              <p className="text-text-secondary text-xs">Paris Network</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-2 mt-4">
            <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <SidebarItem to="/map" icon={MapIcon} label="Map View" />
            <SidebarItem to="/analytics" icon={Wallet} label="Analytics" />
            <SidebarItem to="/settings" icon={Settings} label="Settings" />
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 lg:p-4 border-t border-border-dark">
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-lighter cursor-pointer transition-colors text-left"
          >
            <div className="relative size-9 rounded-full overflow-hidden border border-border-dark shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="User"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface-lighter flex items-center justify-center">
                  <User size={20} className="text-text-secondary" />
                </div>
              )}
            </div>
            <div className="hidden lg:flex flex-col">
              <p className="text-white text-sm font-medium">{user?.firstName || 'Guest'} {user?.lastName || ''}</p>
              <p className="text-text-secondary text-xs">View Profile</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
};

export default Layout;