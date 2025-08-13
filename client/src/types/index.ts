export interface User {
  username: string;
  sector: 'bank' | 'finance' | 'ithr';
  role: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface Schema {
  tables: {
    [tableName: string]: {
      columns: {
        [columnName: string]: {
          type: string;
          nullable: boolean;
          default: string | null;
        };
      };
    };
  };
}

export interface KPISuggestion {
  id: string;
  name: string;
  description: string;
  query_template: string;
}

export interface QueryResult {
  query: string;
  sql_query: string;
  results: {
    table_data: any[];
    chart_data: {
      type: 'bar' | 'line' | 'pie';
      data: any[];
      xAxis: string;
      yAxis: string;
    };
    columns: string[];
    row_count: number;
    execution_time: number;
  };
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  results?: QueryResult;
}
