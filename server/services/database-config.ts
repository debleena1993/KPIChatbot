import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  type: string;
  isActive: boolean;
  schema: any;
  lastConnected: string | null;
}

interface DatabaseConfig {
  currentConnection: string | null;
  connections: Record<string, DatabaseConnection>;
}

const CONFIG_PATH = path.join(process.cwd(), 'server/config/database.json');

export class DatabaseConfigService {
  private static instance: DatabaseConfigService;
  private config!: DatabaseConfig;

  constructor() {
    this.loadConfig();
  }

  static getInstance(): DatabaseConfigService {
    if (!DatabaseConfigService.instance) {
      DatabaseConfigService.instance = new DatabaseConfigService();
    }
    return DatabaseConfigService.instance;
  }

  private loadConfig(): void {
    try {
      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      // If config doesn't exist, create default
      this.config = {
        currentConnection: null,
        connections: {
          default: {
            host: "localhost",
            port: 5432,
            database: "postgres",
            username: "postgres",
            password: "",
            type: "postgresql",
            isActive: false,
            schema: null,
            lastConnected: null
          }
        }
      };
      this.saveConfig();
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save database config:', error);
      throw new Error('Could not save database configuration');
    }
  }

  async testConnection(connectionParams: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }): Promise<boolean> {
    const pool = new Pool({
      host: connectionParams.host,
      port: connectionParams.port,
      database: connectionParams.database,
      user: connectionParams.username,
      password: connectionParams.password,
      ssl: false, // Adjust based on your needs
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      await pool.end();
      return false;
    }
  }

  async extractSchema(connectionParams: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }): Promise<any> {
    const pool = new Pool({
      host: connectionParams.host,
      port: connectionParams.port,
      database: connectionParams.database,
      user: connectionParams.username,
      password: connectionParams.password,
      ssl: false,
    });

    try {
      const client = await pool.connect();
      
      // Get all tables in the database
      const tablesQuery = `
        SELECT 
          table_name,
          table_schema
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_name;
      `;
      
      const tablesResult = await client.query(tablesQuery);
      const tables = [];

      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.table_name;
        const tableSchema = tableRow.table_schema;

        // Get columns for each table
        const columnsQuery = `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = $2
          ORDER BY ordinal_position;
        `;

        const columnsResult = await client.query(columnsQuery, [tableName, tableSchema]);
        
        tables.push({
          name: tableName,
          schema: tableSchema,
          columns: columnsResult.rows.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES',
            default: col.column_default,
            maxLength: col.character_maximum_length,
            precision: col.numeric_precision,
            scale: col.numeric_scale
          }))
        });
      }

      client.release();
      await pool.end();

      // Format schema to match the existing format expected by the frontend
      const formattedTables: Record<string, any> = {};
      tables.forEach((table: any) => {
        const columns: Record<string, any> = {};
        table.columns.forEach((col: any) => {
          columns[col.name] = {
            type: col.type,
            nullable: col.nullable,
            default: col.default
          };
        });
        formattedTables[table.name] = { columns };
      });

      return {
        tables: formattedTables,
        extractedAt: new Date().toISOString(),
        totalTables: tables.length,
        rawTables: tables // Keep original format for reference
      };
    } catch (error) {
      console.error('Schema extraction failed:', error);
      await pool.end();
      throw new Error('Failed to extract database schema');
    }
  }

  async addConnection(connectionId: string, connectionParams: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }): Promise<{ success: boolean; schema?: any; error?: string }> {
    try {
      // Test the connection first
      const isValid = await this.testConnection(connectionParams);
      if (!isValid) {
        return { success: false, error: 'Failed to connect to database with provided credentials' };
      }

      // Extract schema
      const schema = await this.extractSchema(connectionParams);

      // Deactivate current active connection
      Object.keys(this.config.connections).forEach(key => {
        this.config.connections[key].isActive = false;
      });

      // Add new connection
      this.config.connections[connectionId] = {
        ...connectionParams,
        type: 'postgresql',
        isActive: true,
        schema: schema,
        lastConnected: new Date().toISOString()
      };

      this.config.currentConnection = connectionId;
      this.saveConfig();

      return { success: true, schema };
    } catch (error) {
      console.error('Failed to add database connection:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  getCurrentConnection(): DatabaseConnection | null {
    if (!this.config.currentConnection) return null;
    return this.config.connections[this.config.currentConnection] || null;
  }

  getConnectionSchema(): any {
    const current = this.getCurrentConnection();
    return current?.schema || null;
  }

  getAllConnections(): Record<string, DatabaseConnection> {
    return this.config.connections;
  }

  setActiveConnection(connectionId: string): boolean {
    if (!this.config.connections[connectionId]) return false;

    // Deactivate all connections
    Object.keys(this.config.connections).forEach(key => {
      this.config.connections[key].isActive = false;
    });

    // Activate selected connection
    this.config.connections[connectionId].isActive = true;
    this.config.currentConnection = connectionId;
    this.saveConfig();
    return true;
  }

  removeConnection(connectionId: string): boolean {
    if (!this.config.connections[connectionId] || connectionId === 'default') return false;

    delete this.config.connections[connectionId];
    
    if (this.config.currentConnection === connectionId) {
      this.config.currentConnection = 'default';
      this.config.connections.default.isActive = true;
    }

    this.saveConfig();
    return true;
  }
}