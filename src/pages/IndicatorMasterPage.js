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
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #eee' }}>
      <h2>Indicator Master</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 14 }}>
          <label><b>Indicator Name:</b></label><br />
          <input
            type="text"
            value={indicatorName}
            onChange={e => setIndicatorName(e.target.value)}
            required
            style={{ width: '100%', padding: 8, fontSize: 16 }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label><b>Description:</b></label><br />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: 8, fontSize: 16 }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label><b>SQL Query (should return a single integer):</b></label><br />
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
          <label><b>Created By (optional):</b></label><br />
          <input
            type="number"
            value={createdBy}
            onChange={e => setCreatedBy(e.target.value)}
            style={{ width: 180, padding: 6, fontSize: 15 }}
            placeholder="User ID"
          />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '8px 26px', fontSize: 16, borderRadius: 4, background: '#1976d2', color: '#fff', border: 'none' }}>
          {loading ? 'Saving...' : 'Save Indicator'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginBottom: 18 }}>{error}</div>}
      {result && result.success && (
        <div style={{ color: 'green', marginBottom: 18 }}>
          Saved! Query Result: <b>{result.query_result}</b>
        </div>
      )}
      <h3>Saved Indicators</h3>
      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, padding: 10 }}>
        <table style={{ width: '100%', fontSize: 15, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={{ padding: 6, border: '1px solid #eee' }}>Name</th>
              <th style={{ padding: 6, border: '1px solid #eee' }}>Description</th>
              <th style={{ padding: 6, border: '1px solid #eee' }}>Query</th>
              <th style={{ padding: 6, border: '1px solid #eee' }}>Result</th>
              <th style={{ padding: 6, border: '1px solid #eee' }}>Created By</th>
              <th style={{ padding: 6, border: '1px solid #eee' }}>Created On</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>No indicators saved yet.</td></tr>
            )}
            {history.map(row => (
              <tr key={row.id}>
                <td style={{ padding: 6, border: '1px solid #eee' }}>{row.indicator_name}</td>
                <td style={{ padding: 6, border: '1px solid #eee' }}>{row.description}</td>
                <td style={{ padding: 6, border: '1px solid #eee', fontFamily: 'monospace', fontSize: 14 }}>{row.sql_query}</td>
                <td style={{ padding: 6, border: '1px solid #eee', textAlign: 'center' }}>{row.query_result}</td>
                <td style={{ padding: 6, border: '1px solid #eee', textAlign: 'center' }}>{row.created_by || ''}</td>
                <td style={{ padding: 6, border: '1px solid #eee', fontSize: 13 }}>{row.created_on ? new Date(row.created_on).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
