import React, { useState } from 'react';
import axios from 'axios';

export default function IndicatorMasterPage() {
  const [indicatorName, setIndicatorName] = useState('');
  const [description, setDescription] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await axios.post('/api/indicator-master', {
        indicator_name: indicatorName,
        description,
        sql_query: sqlQuery,
        created_by: createdBy || null,
      });
      setResult(res.data);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/indicator-master');
      setHistory(res.data);
    } catch {
      setHistory([]);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="page-main-card">
      <div className="section-card" style={{ maxWidth: 700, margin: '40px auto' }}>
        <h2 className="section-header">Indicator Master</h2>
      <form onSubmit={handleSubmit} className="section-card" style={{ marginBottom: 32, background: '#f8faff', borderRadius: 8 }}>
        <div style={{ marginBottom: 14 }}>
          <label><b className="section-label">Indicator Name:</b></label><br />
          <input
            type="text"
            value={indicatorName}
            onChange={e => setIndicatorName(e.target.value)}
            required
            style={{ width: '100%', padding: 8, fontSize: 16 }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label><b className="section-label">Description:</b></label><br />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: 8, fontSize: 16 }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label><b className="section-label">SQL Query (should return a single integer):</b></label><br />
          <textarea
            value={sqlQuery}
            onChange={e => setSqlQuery(e.target.value)}
            rows={3}
            required
            style={{ width: '100%', padding: 8, fontSize: 15, fontFamily: 'monospace' }}
            placeholder="e.g. SELECT COUNT(*) FROM my_table WHERE ..."
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label><b className="section-label">Created By (optional):</b></label><br />
          <input
            type="number"
            value={createdBy}
            onChange={e => setCreatedBy(e.target.value)}
            style={{ width: 180, padding: 6, fontSize: 15 }}
            placeholder="User ID"
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '8px 22px', fontWeight: 600, borderRadius: 6, background: '#314b89', color: '#fff', border: 'none', fontSize: '1.08rem' }}>
          {loading ? 'Saving...' : 'Save Indicator'}
        </button>
      </form>
      {error && <div style={{ color: '#e53935', marginBottom: 16 }}>{error}</div>}
      {result && result.success && (
        <div style={{ color: 'green', marginBottom: 16 }}>
          Saved! Query Result: <b>{result.query_result}</b>
        </div>
      )}
      <h3 className="section-header-accent">Saved Indicators</h3>
      <div className="section-card" style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e7ef', borderRadius: 8, background: '#fff', padding: 12 }}>
        <table style={{ width: '100%', fontSize: 15, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8faff' }}>
              <th style={{ padding: 7, border: '1px solid #e0e7ef' }}>Name</th>
              <th style={{ padding: 7, border: '1px solid #e0e7ef' }}>Description</th>
              <th style={{ padding: 7, border: '1px solid #e0e7ef' }}>Query</th>
              <th style={{ padding: 7, border: '1px solid #e0e7ef' }}>Result</th>
              <th style={{ padding: 7, border: '1px solid #e0e7ef' }}>Created By</th>
              <th style={{ padding: 7, border: '1px solid #e0e7ef' }}>Created On</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>No indicators saved yet.</td></tr>
            )}
            {history.map(row => (
              <tr key={row.id}>
                <td style={{ padding: 7, border: '1px solid #e0e7ef' }}>{row.indicator_name}</td>
                <td style={{ padding: 7, border: '1px solid #e0e7ef' }}>{row.description}</td>
                <td style={{ padding: 7, border: '1px solid #e0e7ef', fontFamily: 'monospace', fontSize: 14 }}>{row.sql_query}</td>
                <td style={{ padding: 7, border: '1px solid #e0e7ef', textAlign: 'center' }}>{row.query_result}</td>
                <td style={{ padding: 7, border: '1px solid #e0e7ef', textAlign: 'center' }}>{row.created_by || ''}</td>
                <td style={{ padding: 7, border: '1px solid #e0e7ef', fontSize: 13 }}>{row.created_on ? new Date(row.created_on).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
}
