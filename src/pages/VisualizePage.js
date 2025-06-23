import React, { useEffect, useState } from 'react';
import TableSelector from '../components/TableSelector';
import ColumnSelector from '../components/ColumnSelector';
import ChartDisplay from '../components/ChartDisplay';
import axios from 'axios';

export default function VisualizePage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [data, setData] = useState([]);

  const fetchTables = () => {
    axios.get('http://localhost:5000/api/tables')
      .then(res => setTables(res.data))
      .catch(() => setTables([]));
  };
  useEffect(fetchTables, []);

  useEffect(() => {
    if (selectedTable) {
      axios.get(`http://localhost:5000/api/columns/${selectedTable}`)
        .then(res => setColumns(res.data))
        .catch(() => setColumns([]));
      setXAxis('');
      setYAxis('');
      setData([]);
    }
  }, [selectedTable]);

  useEffect(() => {
    if (selectedTable && xAxis && yAxis) {
      axios.post('http://localhost:5000/api/grouped-count', {
        table: selectedTable,
        xAxis,
        indicator: yAxis
      })
        .then(res => setData(res.data))
        .catch(() => setData([]));
    }
  }, [selectedTable, xAxis, yAxis]);

  return (
    <div className="App">
      <div className="dashboard-header">
        <h2>Data Visualization</h2>
      </div>
      <TableSelector tables={tables} selectedTable={selectedTable} onSelect={setSelectedTable} />
      {columns.length > 0 && (
        <ColumnSelector
          columns={columns}
          xAxis={xAxis}
          setXAxis={setXAxis}
          yAxis={yAxis}
          setYAxis={setYAxis}
          chartType={chartType}
          setChartType={setChartType}
        />
      )}
      <ChartDisplay data={data} chartType={chartType} xAxis={xAxis} yAxis={yAxis} />
    </div>
  );
}
