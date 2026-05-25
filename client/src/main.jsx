import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
    <div style={{ zoom: 1.15 }}>
        {loading&&<div style={{position:"fixed",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.accent},${T.green})`,zIndex:9999}}/>}
        {apiError&&<div style={{position:"fixed",top:8,right:16,background:"#ef444499",color:"#fff",padding:"8px 14px",borderRadius:8,fontSize:11,fontWeight:600,zIndex:9999}}>⚠️ API: {apiError}</div>}
        <App />
    </div>
</React.StrictMode>)
