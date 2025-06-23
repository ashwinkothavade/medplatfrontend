import React from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c', '#d0ed57', '#8884d8'];

export default function ChartDisplay({ data, chartType, xAxis, yAxis }) {
  if (!data || data.length === 0 || !xAxis || !yAxis)
    return <div className="card" style={{ textAlign: 'center', color: '#888', fontSize: '1.1rem', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No data to display.</div>;

  // If data has xAxisValue and count, use those for chart keys
  const isGrouped = data.length > 0 && data[0].xaxisvalue !== undefined && data[0].count !== undefined;
  const chartX = isGrouped ? 'xaxisvalue' : xAxis;
  const chartY = isGrouped ? 'count' : yAxis;

  // Helper for histogram binning
  function getHistogramBins(data, xKey, numBins = 10) {
    if (!data || data.length === 0) return [];
    const values = data.map(d => parseFloat(d[xKey])).filter(v => !isNaN(v));
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / numBins;
    const bins = Array(numBins).fill(0).map((_, i) => ({
      bin: `${(min + i * binSize).toFixed(2)} - ${(min + (i + 1) * binSize).toFixed(2)}`,
      count: 0
    }));
    values.forEach(v => {
      let idx = Math.floor((v - min) / binSize);
      if (idx === numBins) idx = numBins - 1;
      bins[idx].count++;
    });
    return bins;
  }

  return (
    <div className="card" style={{ minHeight: 420 }}>
      {chartType === 'bar' && (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <XAxis dataKey={chartX} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={chartY} fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      )}
      {chartType === 'line' && (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <XAxis dataKey={chartX} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={chartY} stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      )}
      {chartType === 'pie' && (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie data={data} dataKey={chartY} nameKey={chartX} cx="50%" cy="50%" outerRadius={120} fill="#8884d8" label>
              {data.map((entry, idx) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
      {chartType === 'histogram' && (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={getHistogramBins(data, chartX)}>
            <XAxis dataKey="bin" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#fc5c7d" />
          </BarChart>
        </ResponsiveContainer>
      )}
      {chartType === 'heatmap' && (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <XAxis dataKey={chartX} name={chartX} />
            <YAxis dataKey={chartY} name={chartY} />
            <ZAxis type="number" range={[50, 500]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter data={data} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
