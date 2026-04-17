
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { runAllTests } from './services/backendTests';

// Test backend connection on app startup (catch errors to avoid unhandled rejections)
runAllTests().catch(err => console.error('runAllTests error:', err));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
