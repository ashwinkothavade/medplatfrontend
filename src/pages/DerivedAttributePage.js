import React, { useState, useEffect } from 'react';
import axios from 'axios';

const operations = [
  { label: '+', value: '+' },
  { label: '-', value: '-' },
  { label: '×', value: '*' },
  { label: '÷', value: '/' },
];

export default function DerivedAttributePage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [options, setOptions] = useState([]);
  const [attr1, setAttr1] = useState('');
  const [attr2, setAttr2] = useState('');
  const [val1, setVal1] = useState(null);
  const [val2, setVal2] = useState(null);
  const [operation, setOperation] = useState('+');
  const [derivedName, setDerivedName] = useState('');
  const [formula, setFormula] = useState('');
  const [result, setResult] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState('');
  const [derivedList, setDerivedList] = useState([]);

  // Fetch tables and derived attributes
  useEffect(() => {
    axios.get('/api/tables').then(res => setTables(res.data)).catch(() => setTables([]));
    axios.get('/api/indicator-master').then(res => setIndicators(res.data)).catch(() => setIndicators([]));
    fetchDerived();
  }, []);

  const fetchDerived = async () => {
    try {
      const res = await axios.get('/api/derived-attributes');
      setDerivedList(res.data);
    } catch {
      setDerivedList([]);
    }
  };

  // Fetch columns when table changes
  useEffect(() => {
    if (selectedTable) {
      axios.get(`/api/columns/${selectedTable}`).then(res => setColumns(res.data)).catch(() => setColumns([]));
    } else {
      setColumns([]);
    }
  }, [selectedTable]);

  // Build dropdown options
  useEffect(() => {
    setOptions([
      ...columns.map(col => ({ label: col, value: col, type: 'column' })),
      ...indicators.map(ind => ({ label: ind.indicator_name, value: ind.indicator_name, type: 'indicator' }))
    ]);
  }, [columns, indicators]);

  // Fetch value for an attribute
  const fetchValue = async (attr, setter) => {
    if (!attr) return setter(null);
    const found = options.find(opt => opt.value === attr);
    if (!found) return setter(null);
    if (found.type === 'column') {
      if (!selectedTable) return setter(null);
      const res = await axios.post('/api/attribute-value', { table: selectedTable, column: attr });
      setter(res.data.value);
    } else if (found.type === 'indicator') {
      const res = await axios.post('/api/attribute-value', { indicator: attr });
      setter(res.data.value);
    }
  };

  // Update values when attributes change
  useEffect(() => {
    if (attr1) fetchValue(attr1, setVal1); else setVal1(null);
  }, [attr1, selectedTable, options]);
  useEffect(() => {
    if (attr2) fetchValue(attr2, setVal2); else setVal2(null);
  }, [attr2, selectedTable, options]);

  // Update formula and result
  useEffect(() => {
    if (attr1 && attr2 && operation && val1 !== null && val2 !== null) {
      let res = null;
      try {
        switch (operation) {
          case '+': res = val1 + val2; break;
          case '-': res = val1 - val2; break;
          case '*': res = val1 * val2; break;
          case '/': res = val2 !== 0 ? parseFloat((val1 / val2).toFixed(6)) : null; break;
          default: res = null;
        }
      } catch {
        res = null;
      }
      setFormula(`${attr1} ${operation} ${attr2}`);
      setResult(res);
    } else {
      setFormula('');
      setResult(null);
    }
  }, [attr1, attr2, operation, val1, val2]);

  const handleSave = async e => {
    e.preventDefault();
    setError('');
    setSaveMsg('');
    if (!derivedName || !formula || result === null) {
      setError('Please fill all fields and ensure result is valid.');
      return;
    }
    try {
      await axios.post('/api/derived-attribute', {
        derived_name: derivedName,
        formula,
        result,
      });
      setSaveMsg('Derived attribute saved!');
      setDerivedName('');
      fetchDerived();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  return (
    <div>
      <div style={{ maxWidth: 800, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #eee' }}>
        <h2>Derived Attribute Builder</h2>
        <div style={{ marginBottom: 18 }}>
          <label><b>Select Table:</b></label><br />
          <input
            list="table-list"
            value={selectedTable}
            onChange={e => setSelectedTable(e.target.value)}
            style={{ width: 320, padding: 8, fontSize: 16 }}
            placeholder="Type or select a table"
          />
          <datalist id="table-list">
            {tables.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
        <div style={{ display: 'flex', gap: 20, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <label><b>Attribute 1:</b></label><br />
            <input
              list="attr1-list"
              value={attr1}
              onChange={e => setAttr1(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 16 }}
              placeholder="Type or select column/indicator"
            />
            <datalist id="attr1-list">
              {options.map(opt => <option key={opt.value} value={opt.value}>{opt.type === 'indicator' ? '(Indicator) ' : ''}{opt.label}</option>)}
            </datalist>
            <div style={{ marginTop: 6, color: '#555', fontSize: 14 }}>
              {val1 !== null && `Value: ${val1}`}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label><b>Attribute 2:</b></label><br />
            <input
              list="attr2-list"
              value={attr2}
              onChange={e => setAttr2(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 16 }}
              placeholder="Type or select column/indicator"
            />
            <datalist id="attr2-list">
              {options.map(opt => <option key={opt.value} value={opt.value}>{opt.type === 'indicator' ? '(Indicator) ' : ''}{opt.label}</option>)}
            </datalist>
            <div style={{ marginTop: 6, color: '#555', fontSize: 14 }}>
              {val2 !== null && `Value: ${val2}`}
            </div>
          </div>
          <div style={{ flex: 0.5 }}>
            <label><b>Operation:</b></label><br />
            <select value={operation} onChange={e => setOperation(e.target.value)} style={{ width: '100%', padding: 8, fontSize: 16 }}>
              {operations.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
          </div>
        </div>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 15 }}>
            <label><b>Derived Attribute Name:</b></label><br />
            <input
              type="text"
              value={derivedName}
              onChange={e => setDerivedName(e.target.value)}
              style={{ width: 320, padding: 8, fontSize: 16 }}
              required
            />
          </div>
          <div style={{ marginBottom: 15, color: '#333', fontSize: 16 }}>
            <b>Formula:</b> {formula || '(select attributes and operation)'}
          </div>
          <div style={{ marginBottom: 15, color: '#333', fontSize: 16 }}>
            <b>Result:</b> {result !== null ? result : '(select attributes and operation)'}
          </div>
          <button type="submit" style={{ padding: '8px 26px', fontSize: 16, borderRadius: 4, background: '#1976d2', color: '#fff', border: 'none' }}>
            Save Derived Attribute
          </button>
          {saveMsg && <div style={{ color: 'green', marginTop: 14 }}>{saveMsg}</div>}
          {error && <div style={{ color: 'red', marginTop: 14 }}>{error}</div>}
        </form>
      </div>

      <div style={{ marginTop: 40 }}>
        <h3>Saved Derived Attributes</h3>
        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, padding: 10 }}>
          <table style={{ width: '100%', fontSize: 15, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ padding: 6, border: '1px solid #eee' }}>Name</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>Formula</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>Result</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>Created On</th>
              </tr>
            </thead>
            <tbody>
              {derivedList.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa' }}>No derived attributes saved yet.</td></tr>
              )}
              {derivedList.map(row => (
                <tr key={row.id}>
                  <td style={{ padding: 6, border: '1px solid #eee' }}>{row.derived_name}</td>
                  <td style={{ padding: 6, border: '1px solid #eee', fontFamily: 'monospace', fontSize: 14 }}>{row.formula}</td>
                  <td style={{ padding: 6, border: '1px solid #eee', textAlign: 'center' }}>{row.result !== null && row.result !== undefined ? Number(row.result).toFixed(6) : ''}</td>
                  <td style={{ padding: 6, border: '1px solid #eee', fontSize: 13 }}>{row.created_on ? new Date(row.created_on).toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

