// ============================================================================
// Anything Download Manager — Popup Window Entry
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { PopupApp } from './components/popup/PopupApp';
import './styles/globals.css';

const rootEl = document.getElementById('popup-root');

if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <PopupApp />
    </React.StrictMode>
  );
}
