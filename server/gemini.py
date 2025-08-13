import google.generativeai as genai
import os
import json
from typing import Dict, Any, Optional

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')

    async def generate_sql_query(self, natural_language_query: str, schema: Dict[str, Any], sector: str) -> Optional[str]:
        """Generate SQL query from natural language using Gemini AI"""
        try:
            # Build schema context
            schema_context = self._build_schema_context(schema)
            
            # Build sector-specific context
            sector_context = self._build_sector_context(sector)
            
            # Create the prompt
            prompt = f"""
You are a SQL expert. Given the database schema and natural language query, generate a safe PostgreSQL query.

DATABASE SCHEMA:
{schema_context}

SECTOR CONTEXT:
{sector_context}

NATURAL LANGUAGE QUERY: {natural_language_query}

IMPORTANT RULES:
1. Generate ONLY the SQL query, no explanations
2. Use proper PostgreSQL syntax
3. Include appropriate WHERE clauses and JOINs
4. Use LIMIT to prevent returning too many rows (max 100)
5. Never use DROP, DELETE, INSERT, UPDATE, or other destructive operations
6. Only use SELECT statements
7. Handle NULL values appropriately
8. Use proper column aliases for readability

SQL Query:
"""

            response = self.model.generate_content(prompt)
            sql_query = response.text.strip()
            
            # Clean up the response
            sql_query = self._clean_sql_query(sql_query)
            
            # Validate the query is safe
            if self._is_safe_query(sql_query):
                return sql_query
            else:
                print(f"Unsafe query generated: {sql_query}")
                return None
                
        except Exception as e:
            print(f"Gemini API error: {e}")
            return None

    def _build_schema_context(self, schema: Dict[str, Any]) -> str:
        """Build schema context string for the prompt"""
        if not schema or "tables" not in schema:
            return "No schema available"
        
        context = []
        for table_name, table_info in schema["tables"].items():
            columns = table_info.get("columns", {})
            column_details = []
            
            for col_name, col_info in columns.items():
                col_type = col_info.get("type", "unknown")
                nullable = "NULL" if col_info.get("nullable") else "NOT NULL"
                column_details.append(f"  {col_name} ({col_type}) {nullable}")
            
            table_context = f"Table: {table_name}\n" + "\n".join(column_details)
            context.append(table_context)
        
        return "\n\n".join(context)

    def _build_sector_context(self, sector: str) -> str:
        """Build sector-specific context for better query generation"""
        sector_contexts = {
            "bank": """
This is a banking sector database. Common KPIs include:
- Account balances and transactions
- Loan approval rates and amounts  
- Customer demographics and banking products
- Branch performance metrics
- Risk assessments and credit scores
""",
            "finance": """
This is a financial services database. Common KPIs include:
- Revenue and profit margins
- Investment portfolio performance
- Client asset values and allocations
- Market trends and analysis
- Fee income and expense ratios
""",
            "ithr": """
This is an IT/HR database. Common KPIs include:
- Employee headcount and turnover
- Hiring metrics and time-to-fill
- Salary and compensation analysis
- Performance ratings and reviews
- Training and development metrics
"""
        }
        
        return sector_contexts.get(sector, "General business database")

    def _clean_sql_query(self, query: str) -> str:
        """Clean and format the SQL query"""
        # Remove code block markers if present
        query = query.replace("```sql", "").replace("```", "").strip()
        
        # Remove any extra whitespace
        lines = [line.strip() for line in query.split('\n') if line.strip()]
        query = ' '.join(lines)
        
        # Ensure it ends with semicolon
        if not query.endswith(';'):
            query += ';'
        
        return query

    def _is_safe_query(self, query: str) -> bool:
        """Check if the generated query is safe to execute"""
        query_upper = query.upper()
        
        # List of dangerous SQL keywords
        dangerous_keywords = [
            'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE',
            'TRUNCATE', 'REPLACE', 'EXEC', 'EXECUTE', 'CALL'
        ]
        
        # Check for dangerous keywords
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return False
        
        # Must start with SELECT
        if not query_upper.strip().startswith('SELECT'):
            return False
        
        return True
