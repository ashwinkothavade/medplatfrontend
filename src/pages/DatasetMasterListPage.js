import React, { useEffect, useState } from "react";
import axios from "axios";
import { askGemini } from "../utils/geminiHelper"; // Gemini Q&A helper
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/*
 * Expected API Endpoints:
 *
 * 1. GET /api/dataset-master
 *    Returns: Array of dataset objects with fields: id, dataset_name, sql_query, created_on, created_by
 *
 * 2. POST /api/dataset-chart (optional)
 *    Body: { sql: "SELECT column, COUNT(*) as count FROM table GROUP BY column", datasetId: 123 }
 *    Returns: Array of objects in format: [{ label: "category1", count: 5 }, { label: "category2", count: 3 }]
 *
 * 3. POST /api/preview-sql (fallback)
 *    Body: { sql: "SELECT column, COUNT(*) as count FROM table GROUP BY column" }
 *    Returns: { rows: [{ column: "value1", count: 5 }, { column: "value2", count: 3 }] }
 *    This is used as fallback if /api/dataset-chart is not available
 *
 * The component will automatically transform preview-sql results into chart format:
 * - 2 columns: first = label, second = count
 * - More columns: first = label, looks for count/total/sum column
 * - 1 column: counts occurrences of values
 */

export default function DatasetMasterListPage() {
  const [datasets, setDatasets] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState("");
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState([]); // [{ column, operator, value, logic }]
  const [availableColumns, setAvailableColumns] = useState([]);

  // Gemini Q&A state
  const [fullData, setFullData] = useState([]); // Full SQL result for Q&A
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const GEMINI_API_KEY = "AIzaSyCsEMKIlTlDe1S3FOehpKIV5eoXuodwKRk"; // User-provided, for demo/dev only

  const operators = [
    "=",
    "!=",
    ">",
    ">=",
    "<",
    "<=",
    "LIKE",
    "ILIKE",
    "IN",
    "NOT IN",
    "IS NULL",
    "IS NOT NULL",
    "BETWEEN",
  ];

  // Function to extract columns from SQL query (basic parsing)
  const extractColumnsFromSQL = (sql) => {
    try {
      // Remove extra whitespace and normalize the SQL
      const normalizedSQL = sql.replace(/\s+/g, " ").trim();

      // Extract the SELECT clause
      const selectMatch = normalizedSQL.match(/SELECT\s+(.*?)\s+FROM/i);
      if (!selectMatch) {
        console.log("Could not find SELECT clause");
        return [];
      }

      const selectClause = selectMatch[1];
      console.log("SELECT clause:", selectClause);

      // Handle SELECT * case
      if (selectClause.trim() === "*") {
        // For SELECT *, we need to extract table names and assume common columns
        // This is a limitation - in a real app, you'd query the database schema
        const tableMatches = normalizedSQL.match(/(?:FROM|JOIN)\s+(\w+)/gi);
        const tables = tableMatches
          ? tableMatches.map((match) =>
              match.replace(/(?:FROM|JOIN)\s+/i, "").trim()
            )
          : [];

        // Return table-prefixed common columns as fallback
        const commonCols = ["id", "name", "status", "type", "date"];
        return tables.length > 0
          ? tables.flatMap((table) =>
              commonCols.map((col) => `${table}.${col}`)
            )
          : commonCols;
      }

      // Parse individual columns from SELECT clause
      const columns = [];

      // Split by comma, but be careful with function calls like COUNT(*)
      const parts = [];
      let currentPart = "";
      let parenthesesCount = 0;

      for (let i = 0; i < selectClause.length; i++) {
        const char = selectClause[i];
        if (char === "(") {
          parenthesesCount++;
        } else if (char === ")") {
          parenthesesCount--;
        } else if (char === "," && parenthesesCount === 0) {
          parts.push(currentPart.trim());
          currentPart = "";
          continue;
        }
        currentPart += char;
      }
      if (currentPart.trim()) {
        parts.push(currentPart.trim());
      }

      console.log("Column parts:", parts);

      // Process each column part
      parts.forEach((part) => {
        // Remove AS aliases to get the base column/expression
        const withoutAs = part
          .replace(/\s+AS\s+["`']?[\w\s]+["`']?$/i, "")
          .trim();

        // Check if it's an aggregate function
        const aggMatch = withoutAs.match(
          /^(COUNT|SUM|AVG|MIN|MAX|COUNT\s+DISTINCT)\s*\(/i
        );
        if (aggMatch) {
          // Extract the column inside the aggregate function
          const innerMatch = withoutAs.match(/\((.*?)\)/);
          if (innerMatch) {
            const innerContent = innerMatch[1].trim();
            if (
              innerContent !== "*" &&
              innerContent.toLowerCase() !== "distinct *"
            ) {
              // Remove DISTINCT keyword if present
              const cleanColumn = innerContent
                .replace(/^DISTINCT\s+/i, "")
                .trim();
              if (
                cleanColumn &&
                !cleanColumn.includes("(") &&
                !cleanColumn.includes(")")
              ) {
                columns.push(cleanColumn);
              }
            }
          }
        } else {
          // Regular column - remove quotes and check if it's a valid column reference
          const cleanColumn = withoutAs.replace(/^["`']|["`']$/g, "").trim();
          if (
            cleanColumn &&
            !cleanColumn.includes("(") &&
            !cleanColumn.includes(")") &&
            !cleanColumn.match(/^\d+$/) && // Not a number
            !cleanColumn.match(/^['"].*['"]$/) // Not a string literal
          ) {
            columns.push(cleanColumn);
          }
        }
      });

      console.log("Extracted columns:", columns);

      // Also extract table names to provide table.column options
      const tableMatches = normalizedSQL.match(/(?:FROM|JOIN)\s+(\w+)/gi);
      const tables = tableMatches
        ? tableMatches.map((match) =>
            match.replace(/(?:FROM|JOIN)\s+/i, "").trim()
          )
        : [];

      // Combine direct columns with table-prefixed versions
      const allColumns = [...columns];

      // Add table-prefixed versions of extracted columns
      tables.forEach((table) => {
        columns.forEach((col) => {
          // If column doesn't already have table prefix, add it
          if (!col.includes(".")) {
            allColumns.push(`${table}.${col}`);
          }
        });
      });

      // Remove duplicates and return
      const uniqueColumns = [...new Set(allColumns)];
      console.log("Final available columns:", uniqueColumns);

      return uniqueColumns.length > 0
        ? uniqueColumns
        : ["id", "name", "status"]; // Fallback
    } catch (err) {
      console.log("Error extracting columns:", err);
      return ["id", "name", "status", "type", "category", "date"]; // Fallback
    }
  };

  // Function to apply filters to SQL query
  const applyFiltersToSQL = (originalSQL, filters) => {
    if (filters.length === 0) return originalSQL;

    let sql = originalSQL.trim();

    // Check if SQL already has WHERE clause
    const hasWhere = sql.toLowerCase().includes("where");

    // Build filter conditions
    const filterConditions = filters
      .map((filter, idx) => {
        let condition = `${filter.column} `;

        if (
          filter.operator === "IS NULL" ||
          filter.operator === "IS NOT NULL"
        ) {
          condition += filter.operator;
        } else if (filter.operator === "IN" || filter.operator === "NOT IN") {
          condition += `${filter.operator} (${filter.value})`;
        } else if (filter.operator === "LIKE" || filter.operator === "ILIKE") {
          condition += `${filter.operator} '%${filter.value}%'`;
        } else if (filter.operator === "BETWEEN") {
          if (Array.isArray(filter.value) && filter.value.length === 2) {
            condition += `BETWEEN '${filter.value[0]}' AND '${filter.value[1]}'`;
          } else {
            condition += "BETWEEN '' AND ''";
          }
        } else {
          condition += `${filter.operator} '${filter.value}'`;
        }

        const logic = idx > 0 ? ` ${filter.logic || "AND"} ` : "";
        return logic + condition;
      })
      .join("");

    // Add filters to SQL
    if (hasWhere) {
      // Find the WHERE clause and add our conditions with AND
      sql = sql.replace(
        /\s+(GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT)/i,
        ` AND ${filterConditions} $1`
      );
      if (!sql.includes(filterConditions)) {
        // If no GROUP BY, ORDER BY etc., just append
        sql += ` AND ${filterConditions}`;
      }
    } else {
      // Add WHERE clause before GROUP BY, ORDER BY, etc.
      sql = sql.replace(
        /\s+(GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT)/i,
        ` WHERE ${filterConditions} $1`
      );
      if (!sql.includes(filterConditions)) {
        // If no GROUP BY, ORDER BY etc., just append
        sql += ` WHERE ${filterConditions}`;
      }
    }

    return sql;
  };

  // Separate function to fetch chart data (can be called with filters)
  const fetchChartData = async (dataset, currentFilters) => {
    setChartLoading(true);
    setChartError("");

    try {
      // Apply filters to the SQL query
      const filteredSQL = applyFiltersToSQL(dataset.sql_query, currentFilters);
      console.log("Original SQL:", dataset.sql_query);
      console.log("Filtered SQL:", filteredSQL);

      // First try the dedicated chart endpoint
      let response;
      let sqlResultData = []; // Store the actual SQL result data for Gemini

      try {
        response = await axios.post("/api/dataset-chart", {
          sql: filteredSQL,
          datasetId: dataset.id,
        });
        setChartData(response.data);

        // Also fetch the raw SQL data for Gemini Q&A
        try {
          const sqlResponse = await axios.post("/api/run-sql", {
            sql: filteredSQL,
          });
          sqlResultData = sqlResponse.data.rows || [];
        } catch (sqlErr) {
          console.log("Could not fetch SQL data for Gemini:", sqlErr);
        }
      } catch (chartErr) {
        console.log("Chart API not available, using preview-sql fallback");

        // Fallback: Use the existing preview-sql endpoint
        response = await axios.post("/api/preview-sql", {
          sql: filteredSQL,
        });

        // Store the SQL result data for Gemini
        sqlResultData = response.data.rows || [];

        // Transform the preview data into chart format
        const rows = response.data.rows || [];
        console.log("SQL Preview data:", rows);

        if (rows.length === 0) {
          setChartData([]);
          setChartError("No data returned from SQL query");
          setFullData([]); // Clear Gemini data too
          return;
        }

        // Get the column names
        const columns = Object.keys(rows[0]);
        console.log("Available columns:", columns);

        // If we have exactly 2 columns, use them as label and count
        if (columns.length === 2) {
          const labelCol = columns[0];
          const countCol = columns[1];

          const chartData = rows.map((row) => ({
            label: String(row[labelCol]),
            count: Number(row[countCol]) || 0,
          }));

          console.log("Chart data (2 columns):", chartData);
          setChartData(chartData);
        }
        // If we have more than 2 columns, try to find a count column
        else if (columns.length > 2) {
          // Look for common count column names
          const countColumn = columns.find(
            (col) =>
              col.toLowerCase().includes("count") ||
              col.toLowerCase().includes("total") ||
              col.toLowerCase().includes("sum") ||
              col.toLowerCase() === "cnt"
          );

          if (countColumn) {
            // Use first column as label and found count column as count
            const labelCol = columns[0];
            const chartData = rows.map((row) => ({
              label: String(row[labelCol]),
              count: Number(row[countColumn]) || 0,
            }));
            console.log("Chart data (count column found):", chartData);
            setChartData(chartData);
          } else {
            // If no count column found, count occurrences of first column
            const labelCol = columns[0];
            const groupedData = rows.reduce((acc, row) => {
              const label = String(row[labelCol]);
              acc[label] = (acc[label] || 0) + 1;
              return acc;
            }, {});

            const chartData = Object.entries(groupedData).map(
              ([label, count]) => ({
                label,
                count,
              })
            );
            console.log("Chart data (grouped):", chartData);
            setChartData(chartData);
          }
        }
        // If only 1 column, count occurrences
        else if (columns.length === 1) {
          const labelCol = columns[0];
          const groupedData = rows.reduce((acc, row) => {
            const label = String(row[labelCol]);
            acc[label] = (acc[label] || 0) + 1;
            return acc;
          }, {});

          const chartData = Object.entries(groupedData).map(
            ([label, count]) => ({
              label,
              count,
            })
          );
          setChartData(chartData);
        } else {
          throw new Error("No data columns found");
        }
      }

      // Update fullData with the current (possibly filtered) SQL result for Gemini Q&A
      setFullData(sqlResultData);
      console.log("Updated fullData for Gemini:", sqlResultData.length, "rows");
    } catch (err) {
      setChartError(err.response?.data?.error || err.message);
      setChartData([]);
      setFullData([]); // Clear Gemini data on error
    } finally {
      setChartLoading(false);
    }
  };

  // Function to handle dataset selection and fetch chart data
  const handleDatasetClick = async (dataset) => {
    setSelectedDataset(dataset);
    setShowChart(true);
    setShowFilters(false);
    setFilters([]);
    setChartLoading(true);
    setChartError("");
    setAnswer(""); // Reset Q&A answer
    setQuestion("");

    // Extract available columns for filtering
    const columns = extractColumnsFromSQL(dataset.sql_query);
    setAvailableColumns(columns);

    // Note: fullData will be populated by fetchChartData
    await fetchChartData(dataset, []);
  };

  // Gemini Q&A handler
  const handleAskGemini = async () => {
    if (!question.trim() || !selectedDataset) return;

    console.log("Asking Gemini with data:", {
      question,
      dataRows: fullData.length,
      availableColumns: availableColumns.length,
      selectedDataset: selectedDataset.dataset_name,
    });

    setIsAsking(true);
    setAnswer("");
    try {
      const columns = availableColumns;
      const sql = selectedDataset.sql_query;
      const data = fullData;

      // Add validation to ensure we have data
      if (!data || data.length === 0) {
        setAnswer(
          "No data available for analysis. Please make sure the SQL query returns results."
        );
        return;
      }

      const geminiAnswer = await askGemini({
        apiKey: GEMINI_API_KEY,
        question,
        columns,
        sql,
        data,
      });
      setAnswer(geminiAnswer);
    } catch (err) {
      setAnswer("Error getting answer from Gemini: " + err.message);
    } finally {
      setIsAsking(false);
    }
  };

  // Function to handle filter changes and refresh chart
  const handleFilterChange = async () => {
    if (selectedDataset) {
      await fetchChartData(selectedDataset, filters);
    }
  };

  // Function to add a new filter
  const addFilter = () => {
    setFilters([
      ...filters,
      {
        column: availableColumns[0] || "",
        operator: "=",
        value: "",
        logic: "AND",
      },
    ]);
  };

  // Function to remove a filter
  const removeFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    // Auto-refresh chart when filter is removed
    setTimeout(() => {
      if (selectedDataset) {
        fetchChartData(selectedDataset, newFilters);
      }
    }, 100);
  };

  // Function to update a filter
  const updateFilter = (index, field, value) => {
    const newFilters = filters.map((filter, i) =>
      i === index ? { ...filter, [field]: value } : filter
    );
    setFilters(newFilters);
  };

  // Function to close chart
  const handleCloseChart = () => {
    setShowChart(false);
    setSelectedDataset(null);
    setChartData([]);
    setChartError("");
    setShowFilters(false);
    setFilters([]);
    setAvailableColumns([]);
  };

  useEffect(() => {
    // Fetch datasets list
    axios
      .get("/api/dataset-master")
      .then((res) => {
        setDatasets(res.data);
      })
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-main-card">
      {/* Chart Section - Only show when dataset is selected */}
      {showChart && (
        <div
          className="section-card"
          style={{ maxWidth: 900, margin: "0 auto", marginBottom: 30 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <h2 className="section-header">
              Chart for: {selectedDataset?.dataset_name}
            </h2>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "1px solid #314b89",
                  background: showFilters ? "#314b89" : "#fff",
                  color: showFilters ? "#fff" : "#314b89",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {showFilters ? "Hide Filters" : "Configure Filters"}
              </button>
              <button
                onClick={handleCloseChart}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "1px solid #dc3545",
                  background: "#dc3545",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Close Chart
              </button>
            </div>
          </div>

          {/* Filter Configuration Section */}
          {showFilters && (
            <div
              style={{
                marginBottom: 20,
                padding: 15,
                border: "1px solid #e0e7ef",
                borderRadius: 6,
                backgroundColor: "#f8f9fa",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 15,
                }}
              >
                <h3 style={{ margin: 0, color: "#314b89" }}>
                  Filter Configuration
                </h3>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={addFilter}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 4,
                      border: "1px solid #28a745",
                      background: "#28a745",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    + Add Filter
                  </button>
                  <button
                    onClick={handleFilterChange}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 4,
                      border: "1px solid #314b89",
                      background: "#314b89",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>

              {filters.length === 0 ? (
                <div style={{ color: "#888", fontStyle: "italic" }}>
                  No filters configured. Click "Add Filter" to create WHERE
                  conditions.
                </div>
              ) : (
                <div>
                  {filters.map((filter, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                        padding: 8,
                        backgroundColor: "#fff",
                        borderRadius: 4,
                        border: "1px solid #e0e7ef",
                      }}
                    >
                      {idx > 0 && (
                        <select
                          value={filter.logic || "AND"}
                          onChange={(e) =>
                            updateFilter(idx, "logic", e.target.value)
                          }
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            padding: 4,
                            borderRadius: 3,
                          }}
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      )}
                      <select
                        value={filter.column}
                        onChange={(e) =>
                          updateFilter(idx, "column", e.target.value)
                        }
                        style={{ fontSize: 13, padding: 4, minWidth: 120 }}
                      >
                        <option value="">Select Column</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filter.operator}
                        onChange={(e) =>
                          updateFilter(idx, "operator", e.target.value)
                        }
                        style={{ fontSize: 13, padding: 4 }}
                      >
                        {operators.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                      {filter.operator &&
                        !["IS NULL", "IS NOT NULL"].includes(filter.operator) &&
                        (filter.operator === "BETWEEN" ? (
                          <>
                            <input
                              type="text"
                              value={
                                Array.isArray(filter.value)
                                  ? filter.value[0] || ""
                                  : ""
                              }
                              placeholder="Start"
                              onChange={(e) => {
                                const start = e.target.value;
                                updateFilter(idx, "value", [
                                  start,
                                  Array.isArray(filter.value)
                                    ? filter.value[1]
                                    : "",
                                ]);
                              }}
                              style={{
                                width: 60,
                                marginRight: 4,
                                padding: 4,
                                fontSize: 13,
                                borderRadius: 3,
                                border: "1px solid #ddd",
                              }}
                            />
                            <span>and</span>
                            <input
                              type="text"
                              value={
                                Array.isArray(filter.value)
                                  ? filter.value[1] || ""
                                  : ""
                              }
                              placeholder="End"
                              onChange={(e) => {
                                const end = e.target.value;
                                updateFilter(idx, "value", [
                                  Array.isArray(filter.value)
                                    ? filter.value[0]
                                    : "",
                                  end,
                                ]);
                              }}
                              style={{
                                width: 60,
                                marginLeft: 4,
                                padding: 4,
                                fontSize: 13,
                                borderRadius: 3,
                                border: "1px solid #ddd",
                              }}
                            />
                          </>
                        ) : (
                          <input
                            type="text"
                            value={filter.value || ""}
                            placeholder="Value"
                            onChange={(e) =>
                              updateFilter(idx, "value", e.target.value)
                            }
                            style={{
                              width: 120,
                              padding: 4,
                              fontSize: 13,
                              borderRadius: 3,
                              border: "1px solid #ddd",
                            }}
                          />
                        ))}
                      <button
                        onClick={() => removeFilter(idx)}
                        style={{
                          color: "#fff",
                          background: "#dc3545",
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: 3,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 10,
                      padding: 8,
                      backgroundColor: "#e7f3ff",
                      borderRadius: 4,
                      fontSize: 12,
                      color: "#0066cc",
                    }}
                  >
                    <strong>Preview:</strong> The filters will be added as WHERE
                    conditions to your SQL query. Click "Apply Filters" to
                    refresh the chart with filtered data.
                  </div>
                </div>
              )}
            </div>
          )}

          {chartLoading && <div>Loading chart...</div>}
          {chartError && (
            <div style={{ color: "red" }}>Chart Error: {chartError}</div>
          )}
          {!chartLoading && !chartError && chartData.length > 0 && (
            <div>
              <div style={{ marginBottom: 15, fontSize: 14, color: "#666" }}>
                Data visualization from SQL query results ({chartData.length}{" "}
                data points)
              </div>
              <div style={{ width: "100%", height: "400px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ef" />
                    <XAxis
                      dataKey="label"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                      stroke="#314b89"
                    />
                    <YAxis
                      label={{
                        value: "Count",
                        angle: -90,
                        position: "insideLeft",
                      }}
                      fontSize={12}
                      stroke="#314b89"
                    />
                    <Tooltip
                      formatter={(value, name) => [value, "Count"]}
                      labelFormatter={(label) => `Category: ${label}`}
                      contentStyle={{
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #314b89",
                        borderRadius: "4px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      fill="#314b89"
                      name="Count"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Gemini Q&A Section */}
              <div
                style={{
                  marginTop: 32,
                  padding: 18,
                  background: "#f9f9fc",
                  borderRadius: 6,
                  border: "1px solid #e0e7ef",
                }}
              >
                <div
                  style={{ fontWeight: 600, color: "#314b89", marginBottom: 8 }}
                >
                  Ask a question about this dataset:
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    style={{
                      flex: 1,
                      padding: 8,
                      fontSize: 15,
                      borderRadius: 4,
                      border: "1px solid #b8c3e1",
                    }}
                    placeholder="e.g. What is the average value of column X?"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAskGemini();
                    }}
                  />
                  <button
                    onClick={handleAskGemini}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 4,
                      background: "#314b89",
                      color: "#fff",
                      border: "none",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: isAsking ? "wait" : "pointer",
                    }}
                    disabled={isAsking || !question.trim()}
                  >
                    {isAsking ? "Asking..." : "Ask"}
                  </button>
                </div>
                {answer && (
                  <div
                    style={{
                      background: "#e8f1ff",
                      borderRadius: 4,
                      padding: 14,
                      color: "#314b89",
                      fontSize: 15,
                      whiteSpace: "pre-wrap",
                      border: "1px solid #b8c3e1",
                    }}
                  >
                    <b>AI BOT:</b> {answer}
                  </div>
                )}
              </div>
            </div>
          )}

          {!chartLoading && !chartError && chartData.length === 0 && (
            <div style={{ textAlign: "center", color: "#888", padding: 20 }}>
              No chart data available for this dataset.
              <br />
              <small style={{ fontSize: 12, color: "#aaa" }}>
                Make sure the SQL query returns data and check the browser
                console for details.
              </small>
            </div>
          )}
        </div>
      )}

      {/* Table Section */}
      <div className="section-card" style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 className="section-header">Dataset Master Table Entries</h2>
        <div
          style={{
            marginBottom: 15,
            fontSize: 14,
            color: "#666",
            fontStyle: "italic",
          }}
        >
          Click on a dataset name to view its chart visualization
        </div>
        {loading && <div>Loading...</div>}
        {error && <div style={{ color: "red" }}>{error}</div>}
        {!loading && !error && (
          <table
            style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}
          >
            <thead>
              <tr style={{ background: "#e0e7ef" }}>
                <th style={{ padding: 8, border: "1px solid #b8c3e1" }}>ID</th>
                <th style={{ padding: 8, border: "1px solid #b8c3e1" }}>
                  Dataset Name
                </th>
                <th style={{ padding: 8, border: "1px solid #b8c3e1" }}>
                  SQL Query
                </th>
                <th style={{ padding: 8, border: "1px solid #b8c3e1" }}>
                  Created On
                </th>
                <th style={{ padding: 8, border: "1px solid #b8c3e1" }}>
                  Created By
                </th>
              </tr>
            </thead>
            <tbody>
              {datasets.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "center", color: "#888", padding: 18 }}
                  >
                    No entries found.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => (
                  <tr key={ds.id}>
                    <td style={{ padding: 8, border: "1px solid #e0e7ef" }}>
                      {ds.id}
                    </td>
                    <td style={{ padding: 8, border: "1px solid #e0e7ef" }}>
                      <button
                        onClick={() => handleDatasetClick(ds)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#314b89",
                          textDecoration: "underline",
                          cursor: "pointer",
                          fontSize: "inherit",
                          fontFamily: "inherit",
                          padding: 0,
                        }}
                      >
                        {ds.dataset_name}
                      </button>
                    </td>
                    <td
                      style={{
                        padding: 8,
                        border: "1px solid #e0e7ef",
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={ds.sql_query}
                    >
                      {ds.sql_query}
                    </td>
                    <td style={{ padding: 8, border: "1px solid #e0e7ef" }}>
                      {ds.created_on
                        ? new Date(ds.created_on).toLocaleString()
                        : ""}
                    </td>
                    <td style={{ padding: 8, border: "1px solid #e0e7ef" }}>
                      {ds.created_by ?? ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
