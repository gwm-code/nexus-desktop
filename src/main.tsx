console.log('[main.tsx] Loading main.tsx');

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('[main.tsx] Imports complete');
console.log('[main.tsx] Tauri available:', typeof (window as any).__TAURI__ !== 'undefined');

const rootElement = document.getElementById('root');
console.log('[main.tsx] Root element:', rootElement);

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log('[main.tsx] React render initiated');
} else {
  console.error('[main.tsx] Root element not found!');
}
