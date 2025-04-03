import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      border: '1px solid #ccc',
      borderRadius: '4px',
      margin: '20px'
    }}>
      <h2>Test Component</h2>
      <p>If you can see this, TypeScript components are working correctly.</p>
    </div>
  );
};

export default TestComponent; 