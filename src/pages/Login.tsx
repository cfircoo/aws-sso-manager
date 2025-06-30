import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSsoContext } from '../contexts/SsoContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { Loader2, Shield, Cloud } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-accent/10 to-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Login Container */}
      <div className="relative z-10 w-full max-w-lg">
       

        {/* Modern Login Form */}
        <div className="glass-card p-10 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-shake">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}
            
            {/* SSO Start URL Field */}
            <div className="space-y-3">
              <label htmlFor="ssoUrl" className="block text-sm font-medium text-secondary">
                SSO Start URL
              </label>
              <div className="relative">
                <input
                  id="ssoUrl"
                  type="text"
                  value={startUrl}
                  onChange={(e) => setStartUrl(e.target.value)}
                  placeholder="https://your-domain.awsapps.com/start"
                  required
                  className="w-full px-6 py-4 bg-bg-card border border-glass-border rounded-xl text-primary placeholder-tertiary focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-lg"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-300 focus-within:opacity-100 pointer-events-none"></div>
              </div>
            </div>

            {/* SSO Region Field */}
            <div className="space-y-3">
              <label htmlFor="ssoRegion" className="block text-sm font-medium text-secondary">
                AWS Region
              </label>
              <div className="relative">
                <input
                  id="ssoRegion"
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="us-east-1"
                  required
                  className="w-full px-6 py-4 bg-bg-card border border-glass-border rounded-xl text-primary placeholder-tertiary focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 text-lg"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-300 focus-within:opacity-100 pointer-events-none"></div>
              </div>
            </div>
            
            {/* Modern Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full py-5 px-8 rounded-xl font-semibold text-white text-lg
                transition-all duration-300 transform relative overflow-hidden
                ${isLoading 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/25'
                }
                flex items-center justify-center space-x-3 group
              `}
            >
              {/* Button Background Animation */}
              {!isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              )}
              
              {/* Button Content */}
              <div className="relative flex items-center space-x-3">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Shield className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                )}
                <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              </div>
            </button>
          </form>
        </div>

        {/* Copyright Footer */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Login;
