import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useTheme from '@/hooks/useTheme';

interface UserData {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_admin: boolean;
}

export default function UserProfile() {
  const [theme] = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
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
        setError('No authentication token found');
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
        setImageError(false);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch user data:', response.status, errorText);
        setError('Failed to fetch user data');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Failed to load avatar:', userData?.avatar_url);
    console.error('Image error event:', e);
    setImageError(true);
    (e.target as HTMLImageElement).src = 'https://www.yuri-lover.win/cdn/pfp/fallback_avatar.png';
  };

  const handleImageLoad = () => {
    console.log('Avatar loaded successfully:', userData?.avatar_url);
    setImageError(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 pt-20">
        <div className="text-center font-comic">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 pt-20">
        <div className="max-w-md mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="container mx-auto p-6 pt-20">
        <div className="max-w-md mx-auto text-center">
          <p className="font-comic mb-4">User data not available</p>
          <Button variant="outline" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-20">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-comic">User Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              {/* Avatar Display */}
              {userData.avatar_url && !imageError ? (
                <div className="relative inline-block mb-4">
                  <img 
                    src={userData.avatar_url} 
                    alt="User Avatar"
                    className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-border"
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center border-2 border-border">
                  <span className="text-4xl">👤</span>
                </div>
              )}
              
              {/* Display Name and Username */}
              <h2 className="text-xl font-comic mb-2 mt-8">
                {userData.display_name || userData.username}
                {userData.is_admin && (
                  <Badge variant="secondary" className="ml-2 font-comic">Admin</Badge>
                )}
              </h2>
              
              <p className="text-sm text-muted-foreground font-comic">
                @{userData.username}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center pt-4">
              <Button asChild>
                <Link to="/user/profile/edit" className="font-comic">
                  Edit Profile
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/" className="font-comic">
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}