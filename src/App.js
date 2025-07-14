import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import VisualizePage from './pages/VisualizePage';
import SqlQueryPage from './pages/SqlQueryPage';
import IndicatorMasterPage from './pages/IndicatorMasterPage';
import DerivedAttributePage from './pages/DerivedAttributePage';
import DatasetBuilderPage from './pages/DatasetBuilderPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="sidenav-layout">
        <nav className="sidenav">
          <Link to="/upload" className="sidenav-link upload"><span role="img" aria-label="upload">⬆️</span> Upload Data</Link>
          <Link to="/visualize" className="sidenav-link visualize"><span role="img" aria-label="visualize">📊</span> Visualize Data</Link>
          <Link to="/sql" className="sidenav-link sql"><span role="img" aria-label="sql">💻</span> Run SQL</Link>
          <Link to="/indicator-master" className="sidenav-link indicator"><span role="img" aria-label="indicator">🏷️</span> Indicator Master</Link>
          <Link to="/derived-attribute" className="sidenav-link derived"><span role="img" aria-label="derived">🧮</span> Derived Attribute Builder</Link>
          <Link to="/dataset-builder" className="sidenav-link dataset"><span role="img" aria-label="dataset">🗃️</span> Dataset Builder</Link>
        </nav>
        <div className="main-content">
          <Routes>
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/visualize" element={<VisualizePage />} />
        <Route path="/sql" element={<SqlQueryPage />} />
        <Route path="/indicator-master" element={<IndicatorMasterPage />} />
        <Route path="/derived-attribute" element={<DerivedAttributePage />} />
        <Route path="/dataset-builder" element={<DatasetBuilderPage />} />
        <Route path="*" element={<Navigate to="/visualize" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
