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

// Global error handler for fatal crashes
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const root = document.getElementById('root');
    if (root && root.innerHTML === '') {
      root.innerHTML = `
        <div style="padding: 20px; background: #09090b; color: #ef4444; font-family: sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">Application Failed to Load</h1>
          <p style="color: #a1a1aa; max-width: 400px; margin-bottom: 24px;">A fatal error occurred during startup. This is often caused by browser restrictions or missing configuration.</p>
          <div style="background: #18181b; padding: 16px; border-radius: 8px; text-align: left; font-family: monospace; font-size: 12px; overflow: auto; max-width: 90vw; border: 1px solid #27272a;">
            <div style="color: #ef4444; font-weight: bold; margin-bottom: 8px;">Error: ${event.message}</div>
            <div style="color: #71717a;">File: ${event.filename}</div>
            <div style="color: #71717a;">Line: ${event.lineno}:${event.colno}</div>
          </div>
          <button onclick="window.location.reload()" style="margin-top: 24px; background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">Reload Application</button>
        </div>
      `;
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
