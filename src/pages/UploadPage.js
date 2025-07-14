import React, { useState, useEffect } from 'react';
import XlsxUploader from '../components/XlsxUploader';
import axios from 'axios';

export default function UploadPage() {
  const [tables, setTables] = useState([]);

  const fetchTables = () => {
    axios.get('http://localhost:5000/api/tables')
      .then(res => setTables(res.data))
      .catch(() => setTables([]));
  };

  useEffect(fetchTables, []);

  return (
    <div className="page-main-card">
      <div className="section-card" style={{ margin: '0 auto', maxWidth: 700 }}>
        <h2 className="section-header">Upload Data (Excel to Database)</h2>
        <XlsxUploader tables={tables} onUpload={fetchTables} />
      </div>
    </div>
  );
}
