import React from 'react';

export default function TableSelector({ tables, selectedTable, onSelect }) {
  return (
    <div className="card">
      <label htmlFor="table-select"><b>Select Table:</b></label>
      <select id="table-select" value={selectedTable} onChange={e => onSelect(e.target.value)} style={{ minWidth: 180 }}>
        <option value="">--Choose a table--</option>
        {tables.map(table => (
          <option key={table} value={table}>{table}</option>
        ))}
      </select>
    </div>
  );
}
