import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QueryResult } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Table as TableIcon, BarChart3, Download, Database, ChevronDown, ChevronUp, Copy } from "lucide-react";

interface ResultsDisplayProps {
  results: QueryResult;
}

export default function ResultsDisplay({ results }: ResultsDisplayProps) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [showFullSQL, setShowFullSQL] = useState(false);

  const { table_data, chart_data, columns, row_count, execution_time } = results.results;

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      // Format large numbers with commas
      if (Math.abs(value) >= 1000) {
        return value.toLocaleString();
      }
      return value.toString();
    }
    return String(value);
  };

  const exportToCSV = () => {
    if (!table_data.length) return;

    const csvContent = [
      columns.join(','),
      ...table_data.map(row => 
        columns.map(col => {
          const value = row[col];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value || '');
          return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'kpi-results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copySQL = async () => {
    try {
      await navigator.clipboard.writeText(results.sql_query);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = results.sql_query;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const renderChart = () => {
    if (!chart_data.data || chart_data.data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No data available for chart visualization</p>
          </div>
        </div>
      );
    }

    const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    switch (chart_data.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chart_data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={chart_data.xAxis} 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey={chart_data.yAxis} 
                stroke={chartColors[0]} 
                strokeWidth={2}
                dot={{ fill: chartColors[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chart_data.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={chart_data.yAxis}
              >
                {chart_data.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default: // bar chart
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart_data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={chart_data.xAxis} 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey={chart_data.yAxis} fill={chartColors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (!table_data.length && !chart_data.data?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No results returned for this query.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                data-testid="button-view-table"
                onClick={() => setViewMode('table')}
                className="h-8"
              >
                <TableIcon className="mr-1 h-3 w-3" />
                Table
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                data-testid="button-view-chart"
                onClick={() => setViewMode('chart')}
                className="h-8"
              >
                <BarChart3 className="mr-1 h-3 w-3" />
                Chart
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Database className="h-4 w-4" />
              <span>{row_count} rows returned</span>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            data-testid="button-export-csv"
            onClick={exportToCSV}
            className="h-8"
          >
            <Download className="mr-1 h-3 w-3" />
            Export CSV
          </Button>
        </div>

        {/* Results Content */}
        {viewMode === 'table' ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column} className="font-medium">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table_data.slice(0, 100).map((row, index) => (
                    <TableRow key={index} data-testid={`table-row-${index}`}>
                      {columns.map((column) => (
                        <TableCell key={column} className="py-2">
                          {formatValue(row[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {table_data.length > 100 && (
              <div className="p-3 bg-gray-50 border-t text-sm text-gray-600 text-center">
                Showing first 100 rows of {table_data.length} total results
              </div>
            )}
          </div>
        ) : (
          <div data-testid="chart-container">
            {renderChart()}
          </div>
        )}

        {/* SQL Query Section */}
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                data-testid="button-toggle-sql"
                onClick={() => setShowFullSQL(!showFullSQL)}
                className="h-8 px-2 text-xs text-gray-600 hover:text-gray-900"
              >
                <Database className="mr-1 h-3 w-3" />
                SQL Query
                {showFullSQL ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </Button>
              {!showFullSQL && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {results.sql_query.length > 60 ? results.sql_query.substring(0, 60) + '...' : results.sql_query}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>Query executed in {execution_time}s</span>
            </div>
          </div>
          
          {showFullSQL && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Generated SQL Query</span>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="button-copy-sql"
                  onClick={copySQL}
                  className="h-6 px-2 text-xs"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
              </div>
              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border overflow-x-auto">
                {results.sql_query}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
