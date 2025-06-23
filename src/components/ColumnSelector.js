import React from 'react';

export default function ColumnSelector({ columns, xAxis, setXAxis, yAxis, setYAxis, chartType, setChartType }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, alignItems: 'center' }}>
        <div>
          <label htmlFor="x-axis"><b>X Axis:</b></label>
          <select id="x-axis" value={xAxis} onChange={e => setXAxis(e.target.value)} style={{ minWidth: 100 }}>
            <option value="">--Select X--</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="y-axis"><b>Y Axis:</b></label>
          <select id="y-axis" value={yAxis} onChange={e => setYAxis(e.target.value)} style={{ minWidth: 100 }}>
            <option value="">--Select Y--</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
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
