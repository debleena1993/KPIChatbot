import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export interface KPISuggestion {
  id: string;
  name: string;
  description: string;
  query_template: string;
  category: string;
}

export async function generateKPISuggestions(
  schema: any,
  sector: string
): Promise<KPISuggestion[]> {
  try {
    const schemaText = JSON.stringify(schema, null, 2);
    
    const systemPrompt = `You are an expert data analyst who generates KPI (Key Performance Indicator) suggestions based on database schemas.

Given a database schema and business sector, analyze the tables, columns, and relationships to suggest relevant KPIs.

Rules:
1. Generate 6-8 practical KPI suggestions
2. Focus on measurable business metrics relevant to the sector
3. Consider common patterns like totals, counts, averages, trends, and ratios
4. Include natural language query templates that users can ask
5. Categorize KPIs (e.g., Financial, Operational, Customer, Performance)
6. Make suggestions specific to the actual data structure available

Respond with JSON array in this exact format:
[
  {
    "id": "unique_kpi_id",
    "name": "Human-readable KPI Name",
    "description": "What this KPI measures and why it's useful",
    "query_template": "Natural language question a user would ask",
    "category": "Category name"
  }
]`;

    const prompt = `Business Sector: ${sector}

Database Schema:
${schemaText}

Based on this database schema for a ${sector} business, generate relevant KPI suggestions that can be calculated from the available data.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: prompt,
    });

    const rawJson = response.text;
    console.log(`Generated KPI suggestions: ${rawJson}`);

    if (rawJson) {
      const suggestions: KPISuggestion[] = JSON.parse(rawJson);
      
      // Validate and clean the suggestions
      return suggestions.filter(suggestion => 
        suggestion.id && 
        suggestion.name && 
        suggestion.description && 
        suggestion.query_template &&
        suggestion.category
      ).slice(0, 8); // Limit to 8 suggestions
    }

    return getFallbackSuggestions(sector);
  } catch (error) {
    console.error("Failed to generate KPI suggestions with AI:", error);
    return getFallbackSuggestions(sector);
  }
}

function getFallbackSuggestions(sector: string): KPISuggestion[] {
  const fallbackSuggestions: Record<string, KPISuggestion[]> = {
    bank: [
      {
        id: "loan_approval_rate",
        name: "Loan Approval Rate",
        description: "Percentage of approved loans versus total applications",
        query_template: "What is the loan approval rate for the last 6 months?",
        category: "Operational"
      },
      {
        id: "account_growth",
        name: "Account Growth",
        description: "Rate of new account openings over time",
        query_template: "Show me the trend in new account openings",
        category: "Growth"
      },
      {
        id: "transaction_volume",
        name: "Transaction Volume",
        description: "Total transaction amounts processed",
        query_template: "What is the daily transaction volume?",
        category: "Operational"
      }
    ],
    finance: [
      {
        id: "revenue_growth",
        name: "Revenue Growth",
        description: "Revenue growth rate over time periods",
        query_template: "Show me quarterly revenue growth",
        category: "Financial"
      },
      {
        id: "profit_margins",
        name: "Profit Margins",
        description: "Profit margin analysis by product or service",
        query_template: "What are the profit margins by product category?",
        category: "Financial"
      },
      {
        id: "client_portfolio_value",
        name: "Client Portfolio Value",
        description: "Total value of client portfolios",
        query_template: "Show me client portfolio value distributions",
        category: "Financial"
      }
    ],
    ithr: [
      {
        id: "employee_turnover",
        name: "Employee Turnover Rate",
        description: "Employee turnover rate by department",
        query_template: "What is the employee turnover rate by department?",
        category: "HR Metrics"
      },
      {
        id: "hiring_metrics",
        name: "Hiring Efficiency",
        description: "Time to hire and hiring success rates",
        query_template: "Show me average time to hire by position level",
        category: "HR Metrics"
      },
      {
        id: "performance_ratings",
        name: "Performance Ratings",
        description: "Employee performance rating distributions",
        query_template: "What are the performance rating trends?",
        category: "Performance"
      }
    ]
  };

  return fallbackSuggestions[sector] || fallbackSuggestions.finance;
}

export async function generateSQLFromQuery(
  naturalLanguageQuery: string,
  schema: any,
  sector: string
): Promise<string> {
  try {
    const schemaText = JSON.stringify(schema, null, 2);
    
    const systemPrompt = `You are an expert SQL generator for ${sector} business data analysis.

Rules:
1. Generate safe, read-only SELECT queries only
2. Use proper PostgreSQL syntax
3. Include appropriate WHERE clauses for filtering
4. Use aggregate functions when appropriate (COUNT, SUM, AVG, etc.)
5. Add ORDER BY and LIMIT when helpful
6. Consider the business context of ${sector}
7. Return ONLY the SQL query with no markdown formatting, no explanations, no code blocks
8. Start the response directly with "SELECT" keyword

Available schema:
${schemaText}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: `Generate SQL for: ${naturalLanguageQuery}

Remember: Return ONLY the SQL query starting with SELECT, no code blocks or explanations.`,
    });

    const rawSQL = response.text || "";
    console.log('Generated raw SQL:', rawSQL);
    
    // Clean up the response to ensure it's just SQL
    let cleanSQL = rawSQL.trim();
    
    // Remove any markdown formatting
    if (cleanSQL.includes('```')) {
      const sqlMatch = cleanSQL.match(/```(?:sql)?\s*(SELECT[\s\S]*?)\s*```/i);
      if (sqlMatch) {
        cleanSQL = sqlMatch[1].trim();
      }
    }
    
    // Remove any leading/trailing whitespace and ensure it starts with SELECT
    cleanSQL = cleanSQL.replace(/^[^S]*SELECT/i, 'SELECT');
    
    console.log('Cleaned SQL:', cleanSQL);
    return cleanSQL;
  } catch (error) {
    console.error("Failed to generate SQL from query:", error);
    
    // Fallback to basic SQL generation based on common patterns
    return generateFallbackSQL(naturalLanguageQuery, schema);
  }
}

function generateFallbackSQL(query: string, schema: any): string {
  const lowerQuery = query.toLowerCase();
  const tables = Object.keys(schema.tables || {});
  
  if (tables.length === 0) {
    throw new Error("No tables available for querying");
  }

  // Try to match common query patterns
  if (lowerQuery.includes("total") && lowerQuery.includes("loan")) {
    if (tables.includes("loans")) {
      return "SELECT SUM(loan_amount) as total_loan_amount, COUNT(*) as total_loans FROM loans;";
    }
  }
  
  if (lowerQuery.includes("customer") && lowerQuery.includes("count")) {
    if (tables.includes("customers")) {
      return "SELECT COUNT(*) as customer_count FROM customers;";
    }
  }
  
  if (lowerQuery.includes("payment") || lowerQuery.includes("transaction")) {
    if (tables.includes("payments")) {
      return "SELECT SUM(amount_paid) as total_payments, COUNT(*) as payment_count FROM payments;";
    }
  }
  
  if (lowerQuery.includes("loan") && lowerQuery.includes("type")) {
    if (tables.includes("loans")) {
      return "SELECT loan_type, COUNT(*) as loan_count, AVG(loan_amount) as avg_amount FROM loans GROUP BY loan_type ORDER BY loan_count DESC;";
    }
  }

  // Default fallback - show data from the first available table
  const firstTable = tables[0];
  const columns = Object.keys(schema.tables[firstTable].columns || {});
  const limitedColumns = columns.slice(0, 5).join(", "); // Limit to first 5 columns
  
  return `SELECT ${limitedColumns} FROM ${firstTable} LIMIT 10;`;
}