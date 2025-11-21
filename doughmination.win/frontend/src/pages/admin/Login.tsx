// Login.tsx with Cloudflare Turnstile and Welcome Message
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useTheme from '@/hooks/useTheme';

interface LoginProps {
  onLogin?: () => void;
}

// Extend Window interface to include turnstile
declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
      }) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [theme] = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeUsername, setWelcomeUsername] = useState("");
  const [welcomeDisplayName, setWelcomeDisplayName] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  
  const from = location.state?.from?.pathname || "/";

  // Load Turnstile script
  useEffect(() => {
    const loadTurnstile = () => {
      if (window.turnstile) {
        setTurnstileLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTurnstileLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Turnstile script');
        setError('Failed to load security verification. Please refresh the page.');
      };
      
      document.head.appendChild(script);
    };

    loadTurnstile();

    // Cleanup function
    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
    };
  }, []);

  // Render Turnstile widget when loaded
  useEffect(() => {
    if (turnstileLoaded && turnstileRef.current && !widgetId.current) {
      try {
        widgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: '0x4AAAAAAB08ZhSxKn5rAD3d',
          callback: (token: string) => {
            setTurnstileToken(token);
            setError(""); // Clear any previous errors
          },
          'error-callback': () => {
            setError('Security verification failed. Please try again.');
            setTurnstileToken(null);
          },
          'expired-callback': () => {
            setError('Security verification expired. Please verify again.');
            setTurnstileToken(null);
          },
          theme: 'auto', // Automatically match the page theme
          size: 'normal'
        });
      } catch (err) {
        console.error('Error rendering Turnstile:', err);
        setError('Failed to initialize security verification.');
      }
    }
  }, [turnstileLoaded]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic form validation
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    // Check for Turnstile token
    if (!turnstileToken) {
      setError("Please complete the security verification");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          turnstile_token: turnstileToken
        }),
      });

      // Read the response as text first to handle any parsing errors
      const responseText = await res.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse login response:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (res.ok && data.access_token) {
        // Store the token
        localStorage.setItem("token", data.access_token);
        
        // Fetch user info for welcome message
        try {
          const userResponse = await fetch("/api/user_info", {
            headers: {
              Authorization: `Bearer ${data.access_token}`
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setWelcomeUsername(userData.username);
            setWelcomeDisplayName(userData.display_name || userData.username);
            
            // Show welcome message
            setShowWelcome(true);
            
            // Call onLogin callback if provided
            if (onLogin) {
              onLogin();
            }
            
            // Redirect after 2 seconds
            setTimeout(() => {
              const redirectTo = from === "/admin/login" ? "/admin/dashboard" : from;
              navigate(redirectTo, { replace: true });
            }, 2000);
          } else {
            // If we can't get user info, just redirect immediately
            if (onLogin) {
              onLogin();
            }
            const redirectTo = from === "/admin/login" ? "/admin/dashboard" : from;
            navigate(redirectTo, { replace: true });
          }
        } catch (userError) {
          console.error('Error fetching user info:', userError);
          // Still redirect on error
          if (onLogin) {
            onLogin();
          }
          const redirectTo = from === "/admin/login" ? "/admin/dashboard" : from;
          navigate(redirectTo, { replace: true });
        }
      } else {
        // Handle login failure
        const errorMessage = data.detail || data.message || "Login failed. Please check your credentials.";
        setError(errorMessage);
        
        // Reset Turnstile on login failure
        if (widgetId.current && window.turnstile) {
          window.turnstile.reset(widgetId.current);
          setTurnstileToken(null);
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Better error message handling
      let errorMessage = "Network error. Please check your connection and try again.";
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.toString && err.toString() !== '[object Object]') {
        errorMessage = err.toString();
      }
      
      setError(errorMessage);
      
      // Reset Turnstile on error
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
        setTurnstileToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show welcome screen after successful login
  if (showWelcome) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center space-y-6">
          <div className="text-6xl animate-bounce">👋</div>
          <h2 className="text-3xl font-bold font-comic text-primary">
            Welcome back!
          </h2>
          <p className="text-xl font-comic">
            {welcomeDisplayName}
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
          <p className="text-sm text-muted-foreground font-comic">
            Redirecting you now...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center font-comic">Admin Login</h2>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <div>
          <label htmlFor="username" className="block mb-1 text-sm font-medium font-comic">
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Enter your username"
            className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 font-comic"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoComplete="username"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block mb-1 text-sm font-medium font-comic">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 font-comic"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {/* Turnstile Widget */}
        <div className="flex flex-col space-y-2">
          <label className="block text-sm font-medium font-comic">
            Security Verification
          </label>
          <div 
            ref={turnstileRef}
            className="flex justify-center"
          />
          {!turnstileLoaded && (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center font-comic">
              Loading security verification...
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          className="bg-blue-600 text-white p-2 rounded disabled:bg-blue-300 transition-colors hover:bg-blue-700 font-comic"
          disabled={loading || !turnstileToken}
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
      
      {loading && (
        <div className="mt-4 text-center text-sm text-gray-500 font-comic">
          Please wait while we log you in...
        </div>
      )}
    </div>
  );
};

export default Login;