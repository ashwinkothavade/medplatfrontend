import React, { useState } from 'react';

export default function ColumnSelector({ columns, xAxis, setXAxis, yAxis, setYAxis, chartType, setChartType }) {
  const [xAxisSearch, setXAxisSearch] = useState('');
  const [xAxisShow, setXAxisShow] = useState(false);
  const [yAxisSearch, setYAxisSearch] = useState('');
  const [yAxisShow, setYAxisShow] = useState(false);
  const filteredX = columns.filter(col => col.toLowerCase().includes((xAxisSearch || '').toLowerCase()));
  const filteredY = columns.filter(col => col.toLowerCase().includes((yAxisSearch || '').toLowerCase()));

  const handleXInputChange = e => {
    setXAxisSearch(e.target.value);
    setXAxisShow(true);
  };
  const handleYInputChange = e => {
    setYAxisSearch(e.target.value);
    setYAxisShow(true);
  };
  const handleXClick = col => {
    setXAxis(col);
    setXAxisSearch(col);
    setXAxisShow(false);
  };
  const handleYClick = col => {
    setYAxis(col);
    setYAxisSearch(col);
    setYAxisShow(false);
  };
  const handleXBlur = () => setTimeout(() => setXAxisShow(false), 100);
  const handleYBlur = () => setTimeout(() => setYAxisShow(false), 100);
  const handleXKeyDown = e => {
    if (e.key === 'Enter') {
      const match = columns.find(c => c.toLowerCase() === xAxisSearch.toLowerCase());
      if (match) {
        setXAxis(match);
        setXAxisShow(false);
      }
    }
  };
  const handleYKeyDown = e => {
    if (e.key === 'Enter') {
      const match = columns.find(c => c.toLowerCase() === yAxisSearch.toLowerCase());
      if (match) {
        setYAxis(match);
        setYAxisShow(false);
      }
    }
  };
  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <label htmlFor="x-axis-search"><b>Type X Axis:</b></label>
          <input
            id="x-axis-search"
            type="text"
            value={xAxisSearch || ''}
            onChange={handleXInputChange}
            onBlur={handleXBlur}
            onFocus={() => setXAxisShow(true)}
            onKeyDown={handleXKeyDown}
            placeholder="Type column name..."
            style={{ marginBottom: 4, width: '98%' }}
            autoComplete="off"
          />
          {xAxisShow && xAxisSearch && filteredX.length > 0 && (
            <ul style={{
              position: 'absolute',
              zIndex: 10,
              background: '#fff',
              border: '1px solid #ddd',
              width: '98%',
              maxHeight: 120,
              overflowY: 'auto',
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}>
              {filteredX.map(col => (
                <li
                  key={col}
                  onMouseDown={() => handleXClick(col)}
                  style={{ padding: '7px 12px', cursor: 'pointer', background: col === xAxis ? '#f0f0fc' : '#fff' }}
                >
                  {col}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <label htmlFor="indicator-search"><b>Indicator (Y Axis):</b></label>
          <input
            id="indicator-search"
            type="text"
            value={yAxisSearch || ''}
            onChange={handleYInputChange}
            onBlur={handleYBlur}
            onFocus={() => setYAxisShow(true)}
            onKeyDown={handleYKeyDown}
            placeholder="Type or select column..."
            style={{ marginBottom: 4, width: '98%' }}
            autoComplete="off"
          />
          {yAxisShow && yAxisSearch && filteredY.length > 0 && (
            <ul style={{
              position: 'absolute',
              zIndex: 10,
              background: '#fff',
              border: '1px solid #ddd',
              width: '98%',
              maxHeight: 120,
              overflowY: 'auto',
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}>
              {filteredY.map(col => (
                <li
                  key={col}
                  onMouseDown={() => handleYClick(col)}
                  style={{ padding: '7px 12px', cursor: 'pointer', background: col === yAxis ? '#f0f0fc' : '#fff' }}
                >
                  {col}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label htmlFor="chart-type"><b>Chart Type:</b></label>
          <select id="chart-type" value={chartType} onChange={e => setChartType(e.target.value)} style={{ minWidth: 120, marginRight: 12 }}>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
            <option value="heatmap">Heatmap</option>
            <option value="histogram">Histogram</option>
          </select>
        </div>
      </div>
    </div>
  );
}
