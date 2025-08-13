import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// JWT secret - in production this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// Predefined admin accounts
const ADMIN_ACCOUNTS = {
  "admin@bank": {
    password: "bank123",
    sector: "bank" as const,
    role: "admin"
  },
  "admin@finance": {
    password: "finance123", 
    sector: "finance" as const,
    role: "admin"
  },
  "admin@ithr": {
    password: "ithr123",
    sector: "ithr" as const,
    role: "admin"
  }
};

// Session storage (in production, use Redis)
const sessions: Record<string, any> = {};

// Request schemas
const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

const dbConnectionSchema = z.object({
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string()
});

const querySchema = z.object({
  query: z.string()
});

// Auth middleware
const authenticateToken = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Login endpoint
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const account = ADMIN_ACCOUNTS[username as keyof typeof ADMIN_ACCOUNTS];
      if (!account || account.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { 
          username, 
          sector: account.sector, 
          role: account.role 
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        access_token: token,
        token_type: "bearer",
        user: {
          username,
          sector: account.sector,
          role: account.role
        }
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Database connection endpoint
  app.post("/api/connect-db", authenticateToken, async (req: Request, res: Response) => {
    try {
      const connectionData = dbConnectionSchema.parse(req.body);
      const user = req.user;
      
      // Store connection info in session (in memory for now)
      const sessionKey = user.username;
      sessions[sessionKey] = {
        db_connection: connectionData,
        schema: {
          tables: {
            employees: {
              columns: {
                id: { type: "integer", nullable: false, default: null },
                name: { type: "varchar", nullable: false, default: null },
                department: { type: "varchar", nullable: true, default: null },
                salary: { type: "numeric", nullable: true, default: null },
                hire_date: { type: "date", nullable: true, default: null }
              }
            },
            departments: {
              columns: {
                id: { type: "integer", nullable: false, default: null },
                name: { type: "varchar", nullable: false, default: null },
                budget: { type: "numeric", nullable: true, default: null }
              }
            },
            transactions: {
              columns: {
                id: { type: "integer", nullable: false, default: null },
                amount: { type: "numeric", nullable: false, default: null },
                transaction_date: { type: "timestamp", nullable: false, default: null },
                account_id: { type: "integer", nullable: false, default: null },
                type: { type: "varchar", nullable: false, default: null }
              }
            }
          }
        }
      };

      // Generate KPI suggestions based on sector
      const suggestedKPIs = generateKPISuggestions(user.sector);

      res.json({
        status: "connected",
        schema: sessions[sessionKey].schema,
        suggested_kpis: suggestedKPIs
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid connection data" });
    }
  });

  // Get schema endpoint
  app.get("/api/schema", authenticateToken, async (req: Request, res: Response) => {
    const sessionKey = req.user.username;
    if (!sessions[sessionKey]) {
      return res.status(400).json({ message: "No active database connection" });
    }
    
    res.json({ schema: sessions[sessionKey].schema });
  });

  // Query KPI endpoint
  app.post("/api/query-kpi", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { query } = querySchema.parse(req.body);
      const user = req.user;
      const sessionKey = user.username;
      
      if (!sessions[sessionKey]) {
        return res.status(400).json({ message: "No active database connection" });
      }

      // Mock SQL generation and results for demo
      const mockSQL = generateMockSQL(query, user.sector);
      const mockResults = generateMockResults(query, user.sector);

      res.json({
        query,
        sql_query: mockSQL,
        results: mockResults,
        execution_time: 0.15
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid query" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", authenticateToken, async (req: Request, res: Response) => {
    const sessionKey = req.user.username;
    if (sessions[sessionKey]) {
      delete sessions[sessionKey];
    }
    res.json({ status: "logged out" });
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateKPISuggestions(sector: string) {
  const suggestions = [];
  
  if (sector === "bank") {
    suggestions.push(
      {
        id: "account_balance",
        name: "Account Balances",
        description: "Total account balances by type",
        query_template: "Show me account balances by account type"
      },
      {
        id: "transaction_volume", 
        name: "Transaction Volume",
        description: "Daily transaction volumes",
        query_template: "Show me daily transaction volumes for the last month"
      },
      {
        id: "loan_performance",
        name: "Loan Performance", 
        description: "Loan approval rates and amounts",
        query_template: "What's the loan approval rate this quarter?"
      }
    );
  } else if (sector === "finance") {
    suggestions.push(
      {
        id: "revenue_trends",
        name: "Revenue Trends",
        description: "Revenue trends over time", 
        query_template: "Show me quarterly revenue trends"
      },
      {
        id: "client_portfolio",
        name: "Client Portfolio",
        description: "Client portfolio values",
        query_template: "Show me client portfolio distribution"
      },
      {
        id: "profit_margins",
        name: "Profit Margins",
        description: "Profit margins by service",
        query_template: "What are the profit margins by service type?"
      }
    );
  } else if (sector === "ithr") {
    suggestions.push(
      {
        id: "employee_count",
        name: "Employee Count", 
        description: "Employee headcount by department",
        query_template: "Show me employee count by department"
      },
      {
        id: "salary_analysis",
        name: "Salary Analysis",
        description: "Average salary by role",
        query_template: "What's the average salary by job title?"
      },
      {
        id: "performance_ratings",
        name: "Performance Ratings",
        description: "Employee performance distribution", 
        query_template: "Show me performance rating distributions"
      }
    );
  }

  return suggestions;
}

function generateMockSQL(query: string, sector: string): string {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes("salary") || lowerQuery.includes("employee")) {
    return "SELECT department, AVG(salary) as avg_salary, COUNT(*) as employee_count FROM employees GROUP BY department ORDER BY avg_salary DESC LIMIT 10;";
  } else if (lowerQuery.includes("transaction") || lowerQuery.includes("volume")) {
    return "SELECT DATE(transaction_date) as date, SUM(amount) as total_amount, COUNT(*) as transaction_count FROM transactions WHERE transaction_date >= NOW() - INTERVAL '30 days' GROUP BY DATE(transaction_date) ORDER BY date;";
  } else if (lowerQuery.includes("department") || lowerQuery.includes("count")) {
    return "SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department ORDER BY employee_count DESC;";
  } else {
    return "SELECT * FROM employees LIMIT 10;";
  }
}

function generateMockResults(query: string, sector: string) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes("salary") || lowerQuery.includes("employee")) {
    return {
      table_data: [
        { department: "Engineering", avg_salary: 95000, employee_count: 25 },
        { department: "Sales", avg_salary: 75000, employee_count: 18 },
        { department: "Marketing", avg_salary: 68000, employee_count: 12 },
        { department: "HR", avg_salary: 62000, employee_count: 8 },
        { department: "Finance", avg_salary: 78000, employee_count: 10 }
      ],
      chart_data: {
        type: "bar" as const,
        data: [
          { department: "Engineering", avg_salary: 95000 },
          { department: "Sales", avg_salary: 75000 },
          { department: "Marketing", avg_salary: 68000 },
          { department: "HR", avg_salary: 62000 },
          { department: "Finance", avg_salary: 78000 }
        ],
        xAxis: "department",
        yAxis: "avg_salary"
      },
      columns: ["department", "avg_salary", "employee_count"],
      row_count: 5,
      execution_time: 0.15
    };
  } else if (lowerQuery.includes("transaction") || lowerQuery.includes("volume")) {
    return {
      table_data: [
        { date: "2024-01-15", total_amount: 125000, transaction_count: 45 },
        { date: "2024-01-16", total_amount: 138000, transaction_count: 52 },
        { date: "2024-01-17", total_amount: 142000, transaction_count: 48 },
        { date: "2024-01-18", total_amount: 159000, transaction_count: 61 },
        { date: "2024-01-19", total_amount: 134000, transaction_count: 43 }
      ],
      chart_data: {
        type: "line" as const,
        data: [
          { date: "2024-01-15", total_amount: 125000 },
          { date: "2024-01-16", total_amount: 138000 },
          { date: "2024-01-17", total_amount: 142000 },
          { date: "2024-01-18", total_amount: 159000 },
          { date: "2024-01-19", total_amount: 134000 }
        ],
        xAxis: "date",
        yAxis: "total_amount"
      },
      columns: ["date", "total_amount", "transaction_count"],
      row_count: 5,
      execution_time: 0.12
    };
  } else if (lowerQuery.includes("department") || lowerQuery.includes("count")) {
    return {
      table_data: [
        { department: "Engineering", employee_count: 25 },
        { department: "Sales", employee_count: 18 },
        { department: "Marketing", employee_count: 12 },
        { department: "Finance", employee_count: 10 },
        { department: "HR", employee_count: 8 }
      ],
      chart_data: {
        type: "pie" as const,
        data: [
          { department: "Engineering", employee_count: 25 },
          { department: "Sales", employee_count: 18 },
          { department: "Marketing", employee_count: 12 },
          { department: "Finance", employee_count: 10 },
          { department: "HR", employee_count: 8 }
        ],
        xAxis: "department",
        yAxis: "employee_count"
      },
      columns: ["department", "employee_count"],
      row_count: 5,
      execution_time: 0.08
    };
  } else {
    return {
      table_data: [
        { id: 1, name: "John Doe", department: "Engineering", salary: 95000 },
        { id: 2, name: "Jane Smith", department: "Sales", salary: 75000 },
        { id: 3, name: "Bob Johnson", department: "Marketing", salary: 68000 }
      ],
      chart_data: {
        type: "bar" as const,
        data: [
          { name: "John Doe", salary: 95000 },
          { name: "Jane Smith", salary: 75000 },
          { name: "Bob Johnson", salary: 68000 }
        ],
        xAxis: "name",
        yAxis: "salary"
      },
      columns: ["id", "name", "department", "salary"],
      row_count: 3,
      execution_time: 0.05
    };
  }
}
