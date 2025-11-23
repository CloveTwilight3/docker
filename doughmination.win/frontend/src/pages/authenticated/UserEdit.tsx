import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import useTheme from '@/hooks/useTheme';

interface UserData {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_admin: boolean;
}

export default function UserEdit() {
  const [theme] = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', content: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fixAvatarUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    
    // If it's a relative URL, return as-is
    if (url.startsWith('/')) return url;
    
    // Fix URLs without www
    if (url.includes('doughmination.win') && !url.includes('www.doughmination.win')) {
      return url.replace('https://doughmination.win', 'https://www.doughmination.win')
                .replace('http://doughmination.win', 'https://www.doughmination.win');
    }
    
    return url;
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', content: 'No authentication token found' });
        setLoading(false);
        return;
      }

      console.log('Fetching user data...');
      const response = await fetch('/api/user_info', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User data received:', data);
        console.log('Original Avatar URL:', data.avatar_url);
        
        // Fix the avatar URL if needed
        data.avatar_url = fixAvatarUrl(data.avatar_url);
        console.log('Fixed Avatar URL:', data.avatar_url);
        
        setUserData(data);
        setDisplayName(data.display_name || '');
        setAvatarPreview(data.avatar_url || null);
        setImageError(false);
      } else {
        setMessage({ type: 'error', content: 'Failed to fetch user data' });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setMessage({ type: 'error', content: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', content: 'Please select an image file' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', content: 'Image size must be less than 5MB' });
        return;
      }

      console.log('Avatar file selected:', file.name, file.type, file.size);
      setAvatarFile(file);
      setImageError(false);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('Preview created');
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    console.log('Removing avatar selection');
    setAvatarFile(null);
    setAvatarPreview(userData?.avatar_url || null);
    setImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Failed to load avatar preview:', avatarPreview);
    setImageError(true);
    (e.target as HTMLImageElement).src = 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png';
  };

  const handleImageLoad = () => {
    console.log('Avatar preview loaded successfully:', avatarPreview);
    setImageError(false);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', content: 'Authentication required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      console.log('Updating profile...');
      
      // Update display name
      const updateResponse = await fetch(`/api/users/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: displayName.trim() || undefined
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      console.log('Display name updated successfully');

      // Upload avatar if changed
      if (avatarFile) {
        console.log('Uploading avatar...');
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const avatarResponse = await fetch(`/api/users/${userData.id}/avatar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!avatarResponse.ok) {
          const errorData = await avatarResponse.json();
          throw new Error(errorData.detail || 'Failed to upload avatar');
        }

        console.log('Avatar uploaded successfully');
      }

      setMessage({ type: 'success', content: 'Profile updated successfully' });
      
      // Refresh user data
      await fetchUserData();
      
      // Reset avatar file state
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      setMessage({ 
        type: 'error', 
        content: err.message || 'Failed to update profile' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userData) return;

    // Validate passwords
    if (!currentPassword) {
      setMessage({ type: 'error', content: 'Current password is required' });
      return;
    }

    if (!newPassword) {
      setMessage({ type: 'error', content: 'New password is required' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', content: 'Password must be at least 8 characters long' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', content: 'Passwords do not match' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', content: 'Authentication required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      console.log('Changing password...');
      const response = await fetch(`/api/users/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }

      console.log('Password changed successfully');
      setMessage({ type: 'success', content: 'Password changed successfully' });
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      setMessage({ 
        type: 'error', 
        content: err.message || 'Failed to change password' 
      });
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

  if (!userData) {
    return (
      <div className="container mx-auto p-6 pt-20">
        <div className="max-w-md mx-auto">
          <Alert variant="destructive">
            <AlertDescription>Failed to load user data</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link to="/user/profile">Back to Profile</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-comic">Edit Profile</h1>
            <p className="text-muted-foreground font-comic">
              Update your profile information
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/user/profile" className="font-comic">
              Cancel
            </Link>
          </Button>
        </div>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.content}</AlertDescription>
          </Alert>
        )}

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="font-comic">Profile Information</CardTitle>
            <CardDescription className="font-comic">
              Update your display name and avatar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-4">
                <Label htmlFor="avatarUpload" className="font-comic">Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {avatarPreview && !imageError ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <span className="text-2xl">👤</span>
                      </div>
                    )}
                    {avatarFile && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="font-comic"
                      >
                        Choose Image
                      </Button>
                      {avatarFile && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          className="font-comic"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {avatarFile && (
                      <p className="text-xs text-muted-foreground font-comic">
                        New file selected: {avatarFile.name}
                      </p>
                    )}
                  </div>
                  <input
                    id="avatarUpload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground font-comic">
                  Recommended: Square image, max 5MB
                </p>
              </div>

              <Separator />

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="font-comic">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter display name"
                  className="font-comic"
                />
                <p className="text-sm text-muted-foreground font-comic">
                  Leave blank to use username: @{userData.username}
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="font-comic"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="font-comic">Change Password</CardTitle>
            <CardDescription className="font-comic">
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="font-comic">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  className="font-comic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="font-comic">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="font-comic"
                />
                <p className="text-sm text-muted-foreground font-comic">
                  Must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-comic">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="font-comic"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="font-comic"
                >
                  {saving ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}