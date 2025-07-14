import React, { useState } from 'react';
import axios from 'axios';

export default function SqlQueryPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const runQuery = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await axios.post('http://localhost:5000/api/run-sql', { query });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-main-card">
      <div className="section-card" style={{ margin: '0 auto', maxWidth: 900 }}>
        <h2 className="section-header">Run SQL Query</h2>
        <form onSubmit={runQuery} style={{ marginBottom: 22 }}>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            rows={5}
            style={{ width: '100%', maxWidth: 740, fontSize: '1.1rem', padding: 10, borderRadius: 7, border: '1px solid #bbb', marginBottom: 10 }}
            placeholder="Enter your SQL query here..."
          />
          <br />
          <button type="submit" disabled={loading || !query.trim()} style={{ padding: '8px 22px', fontWeight: 600, borderRadius: 6, background: '#314b89', color: '#fff', border: 'none', fontSize: '1.08rem' }}>
            {loading ? 'Running...' : 'Run Query'}
          </button>
        </form>
        {error && <div style={{ color: '#e53935', marginBottom: 16 }}>{error}</div>}
        {result && result.fields && result.fields.length > 0 && (
          <div style={{ maxHeight: 400, overflow: 'auto', margin: '16px 0', border: '1px solid #e0e7ef', borderRadius: 8, background: '#fff' }}>
            <table className="sql-result-table" style={{ minWidth: 600, borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8faff', zIndex: 1 }}>
                <tr>
                  {result.fields.map((field, idx) => (
                    <th key={idx} style={{ position: 'sticky', top: 0, background: '#f8faff', borderBottom: '2px solid #e0e7ef', padding: '8px', textAlign: 'left' }}>{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {result.fields.map((field, colIdx) => (
                      <td key={colIdx} style={{ borderBottom: '1px solid #e0e7ef', padding: '8px' }}>{row[field]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && result.fields && result.fields.length === 0 && (
          <div className="card" style={{ marginTop: 10, padding: 18, color: '#888' }}>No rows returned.</div>
        )}
      </div>
    </div>
  );
}
