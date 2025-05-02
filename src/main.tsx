import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SimpleApp from './SimpleApp';
import { SsoProvider } from './contexts/SsoContext';
import { ElectronProvider } from './contexts/ElectronContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Accounts from './pages/Accounts';
import './index.css';

// Configure query client with optimized caching and retry strategies
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

console.log('Initializing application...');

try {
  // Check if root element exists
  console.log('Creating React root element');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found! Make sure there is a div with id="root" in your HTML');
  }
  
  // Create React root
  const root = ReactDOM.createRoot(rootElement);
  console.log('Rendering React app with providers...');
  
  // Render app with all necessary providers
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Router>
          <ElectronProvider>
            <SsoProvider>
              <ThemeProvider>
                <Toaster position="top-right" />
                <Routes>
                  <Route path="/" element={<Splash />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="*" element={<Splash />} />
                </Routes>
              </ThemeProvider>
            </SsoProvider>
          </ElectronProvider>
        </Router>
      </QueryClientProvider>
    </React.StrictMode>
  );
  console.log('React app rendered successfully');
} catch (error) {
  console.error('Failed to render React app:', error);
}
