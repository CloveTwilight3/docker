import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import useTheme from '@/hooks/useTheme';

const AdminDashboard: React.FC = () => {
  const [theme] = useTheme();

  const adminPages = [
    { path: '/admin/switch', label: 'Switch Manager', icon: '🔄', desc: 'Manage fronting members' },
    { path: '/admin/mental', label: 'Mental Health', icon: '🧠', desc: 'Update mental state' },
    { path: '/admin/status', label: 'Status Manager', icon: '💬', desc: 'Set member statuses' },
    { path: '/admin/tags', label: 'Tag Manager', icon: '🏷️', desc: 'Manage member tags' },
    { path: '/admin/users', label: 'User Manager', icon: '👥', desc: 'Manage system users' },
    { path: '/admin/endpoints', label: 'API Endpoints', icon: '🔌', desc: 'View API reference' },
  ];

  return (
    <div className="container mx-auto p-6 pt-20">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-comic">Admin Dashboard</h1>
            <p className="text-muted-foreground font-comic">System management hub</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/" className="font-comic flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Admin Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {adminPages.map((page) => (
            <Link key={page.path} to={page.path}>
              <div className="p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all cursor-pointer text-center group h-full">
                <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{page.icon}</span>
                <h3 className="font-comic font-semibold">{page.label}</h3>
                <p className="text-xs text-muted-foreground font-comic mt-1">{page.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;