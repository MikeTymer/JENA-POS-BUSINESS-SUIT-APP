// Prevent libraries from trying to overwrite window.fetch
if (typeof window !== 'undefined' && window.fetch) {
  try {
    const originalFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      value: originalFetch,
      writable: false,
      configurable: false
    });
  } catch (e) {
    // Already protected or getter-only
  }
}

// Polyfill global for libraries that expect it
if (typeof window !== 'undefined' && typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
