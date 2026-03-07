
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  ShieldAlert,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { apiFetch } from '@/lib/apiClient';

const AdminLayout = ({ children }) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [backendVersion, setBackendVersion] = React.useState('Checking...');

  React.useEffect(() => {
    apiFetch('/health')
      .then(data => setBackendVersion(data.version || 'Unknown'))
      .catch(() => setBackendVersion('Unreachable'));
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },

    { icon: BookOpen, label: 'Novels', path: '/admin/novels' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: MessageSquare, label: 'Comments', path: '/admin/comments' },

    { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },

    { icon: Settings, label: 'Settings', path: '/admin/settings' },
    { icon: ShieldCheck, label: 'IP Whitelist', path: '/admin/whitelist' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-20">
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors">
            <Home className="w-5 h-5" />
            <span className="font-semibold text-lg">Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-purple-500" />
            <span className="text-lg font-bold text-white">Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname.startsWith(item.path) && item.path !== "/admin"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                  : location.pathname === item.path
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative">
        {children}
        <div className="fixed bottom-4 right-8 text-xs text-slate-600 pointer-events-none flex flex-col items-end gap-1 bg-white/80 p-2 rounded shadow backdrop-blur-sm z-50">
          <span className="font-bold text-purple-600">App: V11</span>
          <span>API: {backendVersion}</span>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
