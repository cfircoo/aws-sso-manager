import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSsoContext } from '../contexts/SsoContext';
import { Loader2 } from 'lucide-react';

const Splash = () => {
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useSsoContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('Splash: Checking authentication status...', { isAuthenticated, hasAccessToken: !!accessToken });
      setIsLoading(true); 
      
      // Wait a bit to ensure context has initialized
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsLoading(false);
      
      if (isAuthenticated && accessToken) {
        console.log('Splash: Authenticated, navigating to /accounts');
        navigate('/accounts');
      } else {
        console.log('Splash: Not authenticated, navigating to /login');
        navigate('/login');
      }
    };

    checkAuth();
  }, [isAuthenticated, accessToken, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      backgroundColor: '#f9fafb' 
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
          AWS SSO Manager
        </h1>
        <span style={{
          fontSize: '1rem', // Slightly larger Beta tag for splash
          fontWeight: '600',
          color: '#ea580c', // Orange color
          backgroundColor: '#fff7ed', // Light orange background
          padding: '2px 6px',
          borderRadius: '4px',
          marginLeft: '-4px' // Adjust spacing
        }}>
          Beta
        </span>
      </div>
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', color: '#6b7280', marginTop: '1rem' }}>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Loading session...</span>
        </div>
      )}
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

export default Splash; 