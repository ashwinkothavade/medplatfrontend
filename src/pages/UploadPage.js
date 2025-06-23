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
    <div className="App">
      <div className="dashboard-header">
        <h2>Upload Data (Excel to Database)</h2>
      </div>
      <XlsxUploader tables={tables} onUpload={fetchTables} />
    </div>
  );
}
