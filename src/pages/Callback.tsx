import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          throw new Error(error);
        }

        if (!code || !state) {
          throw new Error('Missing required parameters');
        }

        // Verify state to prevent CSRF
        const savedState = localStorage.getItem('sso_state');
        if (state !== savedState) {
          throw new Error('Invalid state parameter');
        }

        // Send the code back to the main window
        window.opener.postMessage(
          { type: 'SSO_CALLBACK', code },
          window.location.origin
        );

        // Close this window
        window.close();
      } catch (error) {
        console.error('Error in callback:', error);
        window.opener.postMessage(
          { type: 'SSO_CALLBACK', error: error.message },
          window.location.origin
        );
        window.close();
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing SSO Login...</h1>
        <p className="text-gray-600">Please wait while we complete the authentication.</p>
      </div>
    </div>
  );
} 