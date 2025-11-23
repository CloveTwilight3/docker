import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import useTheme from '@/hooks/useTheme';

interface User {
  id: string;
  username: string;
  display_name?: string;
  is_admin: boolean;
  avatar_url?: string;
}

const UserManager: React.FC = () => {
  const [theme] = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; content: string } | null>(null);

  // Create user form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    await Promise.all([
      fetchUsers(),
      fetchCurrentUser()
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', content: 'Authentication required' });
      return;
    }

    try {
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.sort((a: User, b: User) => a.username.localeCompare(b.username)));
      } else {
        setMessage({ type: 'error', content: 'Failed to fetch users' });
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setMessage({ type: 'error', content: 'Network error occurred' });
    }
  };

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/user_info', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.id);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUsername.trim() || !newPassword.trim()) {
      setMessage({ type: 'error', content: 'Username and password are required' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', content: 'Password must be at least 8 characters' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return setMessage({ type: 'error', content: 'Authentication required' });

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          display_name: newDisplayName.trim() || undefined,
          is_admin: newIsAdmin
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create user');
      }

      setMessage({ type: 'success', content: 'User created successfully!' });
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      setNewIsAdmin(false);
      setShowCreateForm(false);
      await fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', content: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (userId === currentUserId) {
      setMessage({ type: 'error', content: 'Cannot delete your own account' });
      return;
    }

    if (!window.confirm(`Delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return setMessage({ type: 'error', content: 'Authentication required' });

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete user');
      }

      setMessage({ type: 'success', content: 'User deleted successfully!' });
      await fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', content: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 pt-20">
        <div className="text-center font-comic">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-comic">User Manager</h1>
            <p className="text-muted-foreground font-comic">Manage system users and permissions</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/dashboard" className="font-comic">Back to Dashboard</Link>
          </Button>
        </div>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.content}</AlertDescription>
          </Alert>
        )}

        {/* Create User Button */}
        {!showCreateForm && (
          <Card>
            <CardContent className="pt-6">
              <Button onClick={() => setShowCreateForm(true)} className="w-full font-comic">
                + Create New User
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="font-comic">Create New User</CardTitle>
              <CardDescription className="font-comic">Add a new user to the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="new-username" className="font-comic">Username *</Label>
                  <Input
                    id="new-username"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter username"
                    className="font-comic"
                    disabled={saving}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="font-comic">Password *</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter password (min 8 characters)"
                    className="font-comic"
                    disabled={saving}
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="new-display-name" className="font-comic">Display Name</Label>
                  <Input
                    id="new-display-name"
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Optional display name"
                    className="font-comic"
                    disabled={saving}
                  />
                </div>

                {/* Admin Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new-is-admin"
                    checked={newIsAdmin}
                    onCheckedChange={(checked) => setNewIsAdmin(checked as boolean)}
                    disabled={saving}
                  />
                  <Label htmlFor="new-is-admin" className="font-comic cursor-pointer">
                    Admin privileges
                  </Label>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="flex-1 font-comic">
                    {saving ? 'Creating...' : 'Create User'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewUsername('');
                      setNewPassword('');
                      setNewDisplayName('');
                      setNewIsAdmin(false);
                    }}
                    disabled={saving}
                    className="font-comic"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-comic">All Users</CardTitle>
            <CardDescription className="font-comic">
              {users.length} user{users.length !== 1 ? 's' : ''} in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <div className="space-y-3">
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUserId;
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-4 bg-muted rounded-lg border ${
                        isCurrentUser ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {/* Avatar */}
                      <img
                        src={user.avatar_url || 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png'}
                        alt={user.display_name || user.username}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png';
                        }}
                      />

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-comic font-semibold">
                            {user.display_name || user.username}
                          </p>
                          {user.is_admin && (
                            <Badge variant="destructive" className="font-comic text-xs">
                              Admin
                            </Badge>
                          )}
                          {isCurrentUser && (
                            <Badge variant="secondary" className="font-comic text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-comic">
                          @{user.username}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {!isCurrentUser && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            disabled={saving}
                            className="font-comic"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-comic text-center py-4">
                No users found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="font-comic">User Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground font-comic">Total Users</p>
                <p className="text-2xl font-bold font-comic">{users.length}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground font-comic">Admins</p>
                <p className="text-2xl font-bold font-comic">
                  {users.filter(u => u.is_admin).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManager;