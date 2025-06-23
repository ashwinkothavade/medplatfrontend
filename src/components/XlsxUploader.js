import React, { useState } from 'react';
import axios from 'axios';

export default function XlsxUploader({ tables, onUpload }) {
  const [file, setFile] = useState(null);
  const [table, setTable] = useState('');
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleTableChange = (e) => {
    setTable(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !table) {
      setStatus('Please select a table and a file.');
      return;
    }
    setStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('table', table);
    try {
      await axios.post('http://localhost:5000/api/upload-xlsx', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('Upload successful!');
      setFile(null);
      if (onUpload) onUpload();
    } catch (err) {
      setStatus('Upload failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="card" style={{ marginBottom: 28 }}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="table-xlsx"><b>Target Table:</b></label>
        <select id="table-xlsx" value={table} onChange={handleTableChange} style={{ minWidth: 180, marginRight: 12 }}>
          <option value="">--Choose table--</option>
          {tables.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input type="file" accept=".xlsx" onChange={handleFileChange} style={{ marginRight: 12 }} />
        <button type="submit">Upload Excel</button>
      </form>
      <div style={{ color: status.includes('failed') ? '#d32f2f' : '#388e3c', marginTop: 8, fontWeight: 500 }}>{status}</div>
    </div>
  );
}
