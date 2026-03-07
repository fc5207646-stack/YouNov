import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
// 部署后若控制台看到此版本说明已加载新代码；若仍报 O.map/0.map 请强制刷新(Ctrl+Shift+R)或清除站点缓存
console.log("YouNov BUILD 2026-03-13 safeMap FIX");
