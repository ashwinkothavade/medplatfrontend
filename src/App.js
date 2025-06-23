import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import VisualizePage from './pages/VisualizePage';
import SqlQueryPage from './pages/SqlQueryPage';
import './App.css';

function App() {
  return (
    <Router>
      <nav style={{ background: '#f3f4f6', padding: '14px 0 10px 0', textAlign: 'center', boxShadow: '0 1px 8px rgba(100,100,100,0.06)' }}>
        <Link to="/upload" style={{ margin: '0 18px', fontWeight: 600, color: '#6a82fb', textDecoration: 'none', fontSize: '1.07rem' }}>Upload Data</Link>
        <Link to="/visualize" style={{ margin: '0 18px', fontWeight: 600, color: '#fc5c7d', textDecoration: 'none', fontSize: '1.07rem' }}>Visualize Data</Link>
        <Link to="/sql" style={{ margin: '0 18px', fontWeight: 600, color: '#009688', textDecoration: 'none', fontSize: '1.07rem' }}>Run SQL</Link>
      </nav>
      <Routes>
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/visualize" element={<VisualizePage />} />
        <Route path="/sql" element={<SqlQueryPage />} />
        <Route path="*" element={<Navigate to="/visualize" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
