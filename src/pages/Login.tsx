import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSsoContext } from '../contexts/SsoContext';
import Header from '../components/Header';
import { toast } from 'sonner';
import { Check, Info, Loader2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isInitialized, accessToken, appSettings, updateAppSettings } = useSsoContext();
  const [region, setRegion] = useState('us-east-1');
  const [startUrl, setStartUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial values from appSettings if available
  useEffect(() => {
    if (appSettings.ssoRegion) {
      setRegion(appSettings.ssoRegion);
    }
    if (appSettings.ssoUrl) {
      setStartUrl(appSettings.ssoUrl);
    }
  }, [appSettings]);

  // Redirect if already authenticated
  useEffect(() => {
    // Only redirect if we're actually authenticated with a token
    if (isAuthenticated && accessToken) {
      console.log('Login: User is already authenticated with valid token, redirecting to accounts');
      navigate('/accounts');
    }
  }, [isAuthenticated, accessToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Login: Attempting login with:', { region, startUrl });
      
      // Save the settings before attempting login
      await updateAppSettings({
        ...appSettings,
        ssoRegion: region,
        ssoUrl: startUrl
      });
      
      // Force the login function to use the provided values instead of appSettings
      const loginParams = {
        region: region,
        startUrl: startUrl
      };
      
      const result = await login(loginParams);
      console.log('Login: Login attempt result:', result);
      
      // The login function in SsoContext will update isAuthenticated/accessToken
      // which will trigger the redirect in useEffect
    } catch (err) {
      console.error('Login: Login error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', color: '#1f2937' }}>AWS SSO Manager Login</h1>
        
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {error && <p style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</p>}
          
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="ssoUrl" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500', color: '#374151', textAlign: 'left' }}>SSO Start URL</label>
            <input
              id="ssoUrl"
              type="text"
              value={startUrl}
              onChange={(e) => setStartUrl(e.target.value)}
              placeholder="https://your-sso-domain.awsapps.com/start"
              required
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #d1d5db', 
                borderRadius: '4px', 
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="ssoRegion" style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500', color: '#374151', textAlign: 'left' }}>SSO Region</label>
            <input
              id="ssoRegion"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="us-east-1"
              required
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #d1d5db', 
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLoading ? 'Logging In...' : 'Login with AWS SSO'}
          </button>
        </form>
      </div>
      <footer style={{
        position: 'absolute',
        bottom: '10px',
        width: '100%',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#6b7280' 
      }}>
        Author: Carmeli Cfir , contact: cfir@carmeli.me | All copyrights reserved to Cfir Carmeli
      </footer>
    </div>
  );
};

export default Login;
