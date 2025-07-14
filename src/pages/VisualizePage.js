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
    if (selectedTable && xAxis) {
      const body = chartType === 'pie'
        ? { table: selectedTable, xAxis, chartType }
        : { table: selectedTable, xAxis, indicator: yAxis, chartType };
      axios.post('http://localhost:5000/api/grouped-count', body)
        .then(res => setData(res.data))
        .catch(() => setData([]));
    }
  }, [selectedTable, xAxis, yAxis, chartType]);

  return (
    <div className="page-main-card">
      <div className="section-card" style={{ margin: '0 auto', maxWidth: 900 }}>
        <h2 className="section-header">Data Visualization</h2>
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
    </div>
  );
}
