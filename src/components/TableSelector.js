import React, { useState } from 'react';

export default function TableSelector({ tables, selectedTable, onSelect }) {
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredTables = tables.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  const handleInputChange = e => {
    setSearch(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = table => {
    setSearch(table);
    onSelect(table);
    setShowSuggestions(false);
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 100); // Delay to allow click
  };

  const handleInputKeyDown = e => {
    if (e.key === 'Enter') {
      const match = tables.find(t => t.toLowerCase() === search.toLowerCase());
      if (match) {
        onSelect(match);
        setShowSuggestions(false);
      }
    }
  };

  return (
    <div className="card" style={{ position: 'relative' }}>
      <label htmlFor="table-search"><b>Type Table Name:</b></label>
      <input
        id="table-search"
        type="text"
        value={search}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleInputKeyDown}
        placeholder="Start typing table name..."
        style={{ marginBottom: 8, width: '98%' }}
        autoComplete="off"
      />
      {showSuggestions && search && filteredTables.length > 0 && (
        <ul style={{
          position: 'absolute',
          zIndex: 10,
          background: '#fff',
          border: '1px solid #ddd',
          width: '98%',
          maxHeight: 150,
          overflowY: 'auto',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}>
          {filteredTables.map(table => (
            <li
              key={table}
              onMouseDown={() => handleSuggestionClick(table)}
              style={{ padding: '7px 12px', cursor: 'pointer', background: table === selectedTable ? '#f0f0fc' : '#fff' }}
            >
              {table}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


