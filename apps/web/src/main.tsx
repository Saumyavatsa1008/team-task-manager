import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const initialTheme = (() => {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem('theme') || 'dark';
})();
document.documentElement.classList.toggle('dark', initialTheme === 'dark');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
