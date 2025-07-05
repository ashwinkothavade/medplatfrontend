import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';

export default function DatasetBuilderPage() {
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [sampleData, setSampleData] = useState({});
  const [joins, setJoins] = useState([]);
  // Column selection and renaming
  const [columnSelections, setColumnSelections] = useState({}); // { table: [{ column_name, selected, alias }] }

  // Derived columns (formulas)
  const [derivedColumns, setDerivedColumns] = useState([]); // [{ name, formula }]
  const [newDerived, setNewDerived] = useState({ name: '', formula: '' });

  // SQL preview/export and data preview
  const [sqlPreview, setSqlPreview] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // WHERE clause builder
  const [whereClauses, setWhereClauses] = useState([]); // [{ table, column, operator, value, logic }]
  const operators = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'ILIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL'];

  // Helper: Generate SQL
  function generateSQL() {
    if (selectedTables.length === 0) return '';
    // SELECT clause
    const selectCols = selectedTables.flatMap(table =>
      (columnSelections[table] || (metadata[table] || []).map(c => ({ column_name: c.column_name, selected: true, alias: c.column_name })))
        .filter(c => c.selected !== false)
        .map(c => `${table}."${c.column_name}"${c.alias && c.alias !== c.column_name ? ` AS "${c.alias}"` : ''}`)
    );
    const derivedCols = derivedColumns.map(dc => `${dc.formula} AS "${dc.name}"`);
    const selectClause = [...selectCols, ...derivedCols].join(', ') || '*';
    // FROM and JOINs
    let fromClause = selectedTables[0];
    let joinClauses = '';
    joins.forEach(j => {
      if (!j.leftTable || !j.leftColumn || !j.rightTable || !j.rightColumn) return;
      joinClauses += ` ${j.joinType} JOIN ${j.rightTable} ON ${j.leftTable}."${j.leftColumn}" = ${j.rightTable}."${j.rightColumn}"`;
    });
    // WHERE clause
    let whereClause = '';
    if (whereClauses.length > 0) {
      let prevLogic = '';
      whereClause = ' WHERE ' + whereClauses.map((w, idx) => {
        let expr = `${w.table}."${w.column}"`;
        if (w.operator === 'IS NULL' || w.operator === 'IS NOT NULL') {
          expr += ` ${w.operator}`;
        } else if (w.operator === 'IN' || w.operator === 'NOT IN') {
          expr += ` ${w.operator} (${w.value})`;
        } else if (w.operator === 'LIKE' || w.operator === 'ILIKE') {
          expr += ` ${w.operator} '%${w.value}%'`;
        } else {
          expr += ` ${w.operator} '${w.value}'`;
        }
        const logic = idx > 0 ? ` ${w.logic || 'AND'} ` : '';
        prevLogic = w.logic;
        return logic + expr;
      }).join('');
    }
    return `SELECT ${selectClause} FROM ${fromClause}${joinClauses}${whereClause}`;
  }

  // Preview handler
  const handlePreview = async () => {
    setSqlPreview('');
    setPreviewData([]);
    setPreviewError('');
    setPreviewLoading(true);
    try {
      const sql = generateSQL();
      setSqlPreview(sql);
      const res = await axios.post('/api/preview-sql', { sql });
      setPreviewData(res.data.rows || []);
    } catch (err) {
      setPreviewError(err.response?.data?.error || err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Fetch all tables on mount
  useEffect(() => {
    axios.get('/api/tables').then(res => setTables(res.data)).catch(() => setTables([]));
  }, []);

  // Fetch metadata and sample data for selected tables
  useEffect(() => {
    selectedTables.forEach(table => {
      if (!metadata[table]) {
        axios.get(`/api/table-metadata/${table}`).then(res => setMetadata(m => ({ ...m, [table]: res.data })));
      }
      if (!sampleData[table]) {
        axios.get(`/api/sample-data/${table}?limit=10`).then(res => setSampleData(d => ({ ...d, [table]: res.data })));
      }
    });
  }, [selectedTables]);

  // Handle table selection (multi-select)
  const handleTableChange = e => {
    const opts = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setSelectedTables(opts);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #eee' }}>
      <h2>SQL Dataset Builder</h2>
      <div style={{ marginBottom: 24 }}>
        <label><b>Select Tables:</b></label>
        <div style={{ maxWidth: 450, marginBottom: 10 }}>
          <Select
            isMulti
            isSearchable
            placeholder="Select tables..."
            options={tables.map(t => ({ value: t, label: t }))}
            value={selectedTables.map(t => ({ value: t, label: t }))}
            onChange={opts => {
              setSelectedTables(opts ? opts.map(o => o.value) : []);
            }}
            styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
          />
        </div>
      </div>

      {/* --- Join Configuration Section --- */}
      {selectedTables.length > 1 && (
        <div style={{ marginBottom: 32, border: '1px solid #e0e0e0', borderRadius: 8, padding: 18, background: '#fafbfc' }}>
          <h3 style={{ color: '#009688', marginBottom: 10 }}>Join Configuration</h3>
          <button
            type="button"
            onClick={() => setJoins([...joins, {
              leftTable: selectedTables[0],
              leftColumn: metadata[selectedTables[0]]?.[0]?.column_name || '',
              rightTable: selectedTables[1],
              rightColumn: metadata[selectedTables[1]]?.[0]?.column_name || '',
              joinType: 'INNER',
            }])}
            style={{ marginBottom: 12, padding: '5px 14px', borderRadius: 4, border: '1px solid #bbb', background: 'red', cursor: 'pointer', fontWeight: 500 }}
          >
            + Add Join
          </button>
          {joins.length === 0 && <div style={{ color: '#aaa', marginBottom: 10 }}>No joins defined yet.</div>}
          {joins.map((join, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <select value={join.leftTable} onChange={e => {
                const val = e.target.value;
                setJoins(js => js.map((j, i) => i === idx ? { ...j, leftTable: val, leftColumn: metadata[val]?.[0]?.column_name || '' } : j));
              }} style={{ fontSize: 15, padding: 4 }}>
                {selectedTables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span>.</span>
              <select value={join.leftColumn} onChange={e => {
                const val = e.target.value;
                setJoins(js => js.map((j, i) => i === idx ? { ...j, leftColumn: val } : j));
              }} style={{ fontSize: 15, padding: 4 }}>
                {(metadata[join.leftTable] || []).map(col => <option key={col.column_name} value={col.column_name}>{col.column_name}</option>)}
              </select>
              <select value={join.joinType} onChange={e => {
                const val = e.target.value;
                setJoins(js => js.map((j, i) => i === idx ? { ...j, joinType: val } : j));
              }} style={{ fontSize: 15, padding: 4, fontWeight: 600 }}>
                <option value="INNER">INNER</option>
                <option value="LEFT">LEFT</option>
                <option value="RIGHT">RIGHT</option>
                <option value="FULL">FULL</option>
              </select>
              <select value={join.rightTable} onChange={e => {
                const val = e.target.value;
                setJoins(js => js.map((j, i) => i === idx ? { ...j, rightTable: val, rightColumn: metadata[val]?.[0]?.column_name || '' } : j));
              }} style={{ fontSize: 15, padding: 4 }}>
                {selectedTables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span>.</span>
              <select value={join.rightColumn} onChange={e => {
                const val = e.target.value;
                setJoins(js => js.map((j, i) => i === idx ? { ...j, rightColumn: val } : j));
              }} style={{ fontSize: 15, padding: 4 }}>
                {(metadata[join.rightTable] || []).map(col => <option key={col.column_name} value={col.column_name}>{col.column_name}</option>)}
              </select>
              <button type="button" onClick={() => setJoins(js => js.filter((_, i) => i !== idx))} style={{ color: '#fff', background: '#e53935', border: 'none', padding: '3px 10px', borderRadius: 4, marginLeft: 10, cursor: 'pointer' }}>Remove</button>
            </div>
          ))}
          {joins.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 15 }}>
              <b>Current Joins:</b>
              <ul style={{ margin: '6px 0 0 10px' }}>
                {joins.map((j, i) => (
                  <li key={i}>{j.leftTable}.{j.leftColumn} <b>{j.joinType}</b> {j.rightTable}.{j.rightColumn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* --- Column Selection & Renaming Section --- */}
      {selectedTables.map(table => (
        <div key={table} style={{ marginBottom: 40, border: '1px solid #eee', borderRadius: 8, padding: 18 }}>
          <h3 style={{ color: '#1976d2' }}>{table}</h3>
          <div style={{ marginBottom: 10 }}>
            <b>Columns (Select & Rename):</b>
            <div style={{ marginBottom: 10, maxWidth: 450 }}>
              <Select
                isMulti
                isSearchable
                placeholder="Select columns..."
                options={(metadata[table] || []).map(col => ({ value: col.column_name, label: `${col.column_name} (${col.data_type})` }))}
                value={(columnSelections[table] || []).filter(c => c.selected).map(c => ({ value: c.column_name, label: `${c.column_name} (${(metadata[table]||[]).find(mc=>mc.column_name===c.column_name)?.data_type||''})` }))}
                onChange={selectedOpts => {
                  const selectedCols = (selectedOpts || []).map(opt => opt.value);
                  setColumnSelections(cs => ({
                    ...cs,
                    [table]: (metadata[table] || []).map(c => ({
                      column_name: c.column_name,
                      selected: selectedCols.includes(c.column_name),
                      alias: (cs[table] || []).find(col => col.column_name === c.column_name)?.alias || c.column_name
                    }))
                  }));
                }}
                styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button type="button" style={{ padding: '3px 12px', borderRadius: 4, border: '1px solid #bbb', background: 'black', cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => setColumnSelections(cs => ({
                    ...cs,
                    [table]: (metadata[table] || []).map(c => ({ column_name: c.column_name, selected: true, alias: (cs[table] || []).find(col => col.column_name === c.column_name)?.alias || c.column_name }))
                  }))}
                >Select All</button>
                <button type="button" style={{ padding: '3px 12px', borderRadius: 4, border: '1px solid #bbb', background: 'black', cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => setColumnSelections(cs => ({
                    ...cs,
                    [table]: (metadata[table] || []).map(c => ({ column_name: c.column_name, selected: false, alias: (cs[table] || []).find(col => col.column_name === c.column_name)?.alias || c.column_name }))
                  }))}
                >Clear All</button>
              </div>
            </div>
            <div>
              <b>Rename Selected Columns:</b>
              <table style={{ borderCollapse: 'collapse', fontSize: 15, margin: '10px 0' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #eee', padding: 5 }}>Column</th>
                    <th style={{ border: '1px solid #eee', padding: 5 }}>Alias</th>
                  </tr>
                </thead>
                <tbody>
                  {(columnSelections[table] || (metadata[table] || []).map(c => ({ column_name: c.column_name, selected: true, alias: c.column_name })))
                    .filter(c => c.selected !== false)
                    .map(col => (
                      <tr key={col.column_name}>
                        <td style={{ border: '1px solid #eee', padding: 5, fontFamily: 'monospace' }}>{col.column_name}</td>
                        <td style={{ border: '1px solid #eee', padding: 5 }}>
                          <input
                            type="text"
                            value={col.alias}
                            style={{ width: 120 }}
                            onChange={e => {
                              setColumnSelections(cs => ({
                                ...cs,
                                [table]: (cs[table] || (metadata[table] || []).map(c => ({ column_name: c.column_name, selected: true, alias: c.column_name }))).map(c =>
                                  c.column_name === col.column_name ? { ...c, alias: e.target.value } : c
                                )
                              }));
                            }}
                          />
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <b>Sample Data:</b>
            <div style={{ overflowX: 'auto', marginTop: 6 }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 14, minWidth: 500 }}>
                <thead>
                  <tr>
                    {(sampleData[table] && sampleData[table][0]) ? Object.keys(sampleData[table][0]).map(col => (
                      <th key={col} style={{ border: '1px solid #eee', padding: 5, background: '#f8f8f8' }}>{col}</th>
                    )) : null}
                  </tr>
                </thead>
                <tbody>
                  {(sampleData[table] || []).length === 0 ? (
                    <tr><td colSpan={10} style={{ color: '#aaa', textAlign: 'center' }}>No data</td></tr>
                  ) : sampleData[table].map((row, i) => (
                    <tr key={i}>
                      {Object.keys(row).map(col => (
                        <td key={col} style={{ border: '1px solid #eee', padding: 5 }}>{String(row[col])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* --- Column Selection Summary --- */}
      {selectedTables.length > 0 && (
        <div style={{ margin: '30px 0', padding: 18, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fcfcfc' }}>
          <b>Selected Columns for Output Dataset:</b>
          <ul style={{ margin: '10px 0 0 16px', fontSize: 15 }}>
            {selectedTables.flatMap(table =>
              (columnSelections[table] || (metadata[table] || []).map(c => ({ column_name: c.column_name, selected: true, alias: c.column_name })))
                .filter(c => c.selected !== false)
                .map(c => (
                  <li key={table + '.' + c.column_name}>
                    <span style={{ color: '#1976d2' }}>{table}</span>.<span style={{ fontFamily: 'monospace' }}>{c.column_name}</span>
                    {c.alias && c.alias !== c.column_name ? <span> as <b>{c.alias}</b></span> : null}
                  </li>
                ))
            )}
          </ul>
        </div>
      )}

      {/* --- Derived Columns (Formula Builder) --- */}
      <div style={{ margin: '30px 0', padding: 18, border: '1px solid #e0e0e0', borderRadius: 8, background: '#f6fafd' }}>
        <b>Derived Columns (Formula Builder):</b>
        <div style={{ margin: '10px 0 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="text"
            placeholder="Column Name"
            value={newDerived.name}
            style={{ width: 180, padding: 6, fontSize: 15 }}
            onChange={e => setNewDerived(d => ({ ...d, name: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Formula (e.g., users.age + orders.amount)"
            value={newDerived.formula}
            style={{ width: 340, padding: 6, fontSize: 15 }}
            onChange={e => setNewDerived(d => ({ ...d, formula: e.target.value }))}
          />
          <button
            type="button"
            onClick={() => {
              if (newDerived.name && newDerived.formula) {
                setDerivedColumns(cols => [...cols, newDerived]);
                setNewDerived({ name: '', formula: '' });
              }
            }}
            style={{ padding: '6px 18px', borderRadius: 4, border: '1px solid #bbb', background: '#fff', cursor: 'pointer', fontWeight: 500 }}
          >
            + Add Derived Column
          </button>
        </div>
        {derivedColumns.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <b>Derived Columns:</b>
            <ul style={{ margin: '8px 0 0 16px', fontSize: 15 }}>
              {derivedColumns.map((col, i) => (
                <li key={i}><b>{col.name}</b> = <span style={{ fontFamily: 'monospace' }}>{col.formula}</span> <button type="button" onClick={() => setDerivedColumns(cols => cols.filter((_, idx) => idx !== i))} style={{ color: '#fff', background: '#e53935', border: 'none', padding: '2px 8px', borderRadius: 4, marginLeft: 8, cursor: 'pointer', fontSize: 13 }}>Remove</button></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* --- WHERE Clause Builder --- */}
      <div style={{ margin: '30px 0', padding: 18, border: '1px solid #e0e0e0', borderRadius: 8, background: '#f5fafd' }}>
        <b>Filter Rows (WHERE Clause):</b>
        {whereClauses.map((w, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
            {idx > 0 && (
              <select value={w.logic || 'AND'} onChange={e => setWhereClauses(clauses => clauses.map((c, i) => i === idx ? { ...c, logic: e.target.value } : c))} style={{ fontSize: 15, fontWeight: 600 }}>
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            )}
            <select value={w.table} onChange={e => setWhereClauses(clauses => clauses.map((c, i) => i === idx ? { ...c, table: e.target.value, column: '' } : c))} style={{ fontSize: 15 }}>
              <option value="">Table</option>
              {selectedTables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={w.column} onChange={e => setWhereClauses(clauses => clauses.map((c, i) => i === idx ? { ...c, column: e.target.value } : c))} style={{ fontSize: 15 }}>
              <option value="">Column</option>
              {(metadata[w.table] || []).map(col => <option key={col.column_name} value={col.column_name}>{col.column_name}</option>)}
            </select>
            <select value={w.operator} onChange={e => setWhereClauses(clauses => clauses.map((c, i) => i === idx ? { ...c, operator: e.target.value } : c))} style={{ fontSize: 15 }}>
              <option value="">Operator</option>
              {operators.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            {w.operator && !['IS NULL','IS NOT NULL'].includes(w.operator) && (
              <input
                type="text"
                value={w.value || ''}
                placeholder="Value"
                onChange={e => setWhereClauses(clauses => clauses.map((c, i) => i === idx ? { ...c, value: e.target.value } : c))}
                style={{ width: 120 }}
              />
            )}
            <button type="button" onClick={() => setWhereClauses(clauses => clauses.filter((_, i) => i !== idx))} style={{ color: '#fff', background: '#e53935', border: 'none', padding: '2px 8px', borderRadius: 4, marginLeft: 4, cursor: 'pointer', fontSize: 13 }}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setWhereClauses(clauses => [...clauses, { table: selectedTables[0] || '', column: '', operator: '', value: '', logic: 'AND' }])} style={{ marginTop: 8, padding: '4px 14px', borderRadius: 4, border: '1px solid #bbb', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          + Add Condition
        </button>
      </div>

      {/* --- SQL Preview & Data Preview --- */}
      <div style={{ margin: '30px 0', padding: 18, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fff' }}>
        <button
          type="button"
          onClick={handlePreview}
          style={{ padding: '7px 22px', borderRadius: 4, border: '1px solid #1976d2', background: '#1976d2', color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 14 }}
          disabled={previewLoading || selectedTables.length === 0}
        >
          {previewLoading ? 'Loading...' : 'Preview Dataset'}
        </button>
        {sqlPreview && (
          <div style={{ margin: '10px 0 18px 0' }}>
            <b>Generated SQL:</b>
            <pre style={{ background: '#f7f7fa', border: '1px solid #eee', borderRadius: 5, padding: 12, fontSize: 14, color: '#333', marginTop: 6 }}>{sqlPreview}</pre>
          </div>
        )}
        {previewError && (
          <div style={{ color: '#e53935', margin: '10px 0', fontWeight: 600 }}>{previewError}</div>
        )}
        {previewData && previewData.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <b>Preview Data (first {previewData.length} rows):</b>
            <table style={{ borderCollapse: 'collapse', fontSize: 14, minWidth: 500, marginTop: 6 }}>
              <thead>
                <tr>
                  {Object.keys(previewData[0]).map(col => (
                    <th key={col} style={{ border: '1px solid #eee', padding: 5, background: '#f8f8f8' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i}>
                    {Object.keys(row).map(col => (
                      <td key={col} style={{ border: '1px solid #eee', padding: 5 }}>{String(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sqlPreview && !previewLoading && (
          <button
            style={{ marginTop: 12, padding: '7px 20px', fontSize: 16, background: '#43a047', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 500 }}
            onClick={async () => {
              const tableName = prompt('Enter a name for the new table (letters, numbers, underscore):');
              if (!tableName) return;
              if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
                alert('Invalid table name. Use only letters, numbers, and underscores, starting with a letter or underscore.');
                return;
              }
              try {
                const res = await axios.post('/api/save-dataset', { sql: sqlPreview, tableName });
                alert(res.data.message || 'Dataset saved!');
              } catch (err) {
                alert(err.response?.data?.error || err.message || 'Failed to save dataset.');
              }
            }}
          >Save Dataset</button>
        )}
      </div>
    </div>
  );
}
