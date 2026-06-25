import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LangProvider } from './i18n.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
  <LangProvider>
    <div style={{ zoom: 1.15 }}>
      <App />
    </div>
  </LangProvider>
</React.StrictMode>)
