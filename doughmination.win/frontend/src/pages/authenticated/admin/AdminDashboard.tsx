import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useTheme from '@/hooks/useTheme';

const AdminDashboard: React.FC = () => {
  const [theme] = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; content: string } | null>(null);

  const adminPages = [
    { path: '/admin/switch', label: 'Switch Manager', icon: '🔄', desc: 'Manage fronting members' },
    { path: '/admin/mental', label: 'Mental Health', icon: '🧠', desc: 'Update mental state' },
    { path: '/admin/status', label: 'Status Manager', icon: '💬', desc: 'Set member statuses' },
    { path: '/admin/tags', label: 'Tag Manager', icon: '🏷️', desc: 'Manage member tags' },
    { path: '/admin/endpoints', label: 'API Endpoints', icon: '🔌', desc: 'View API reference' },
  ];

  const handleForceRefresh = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', content: 'Authentication required' });
      return;
    }

    if (!window.confirm('This will reload the website for ALL connected users. Are you sure?')) {
      return;
    }

    setRefreshing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send refresh command');
      }

      setMessage({ 
        type: 'success', 
        content: 'Refresh command sent to all connected clients! The page will reload in 3 seconds...' 
      });

      // Reload this page after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      setMessage({ type: 'error', content: err.message });
      setRefreshing(false);
    }
  };

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

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.content}</AlertDescription>
          </Alert>
        )}

        {/* Force Refresh Button */}
        <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-comic font-semibold text-destructive mb-1">
                🔄 Force Refresh All Clients
              </h3>
              <p className="text-sm font-comic text-muted-foreground">
                Send a refresh command to all users currently viewing the website. This will immediately reload their browsers.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleForceRefresh}
              disabled={refreshing}
              className="font-comic whitespace-nowrap"
            >
              {refreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                '🔄 Refresh All'
              )}
            </Button>
          </div>
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