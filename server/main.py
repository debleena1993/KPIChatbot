from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import os
from dotenv import load_dotenv

from auth import verify_token, create_access_token, verify_password, get_password_hash
from database import DatabaseManager
from gemini import GeminiService
from models import LoginRequest, DatabaseConnectionRequest, QueryRequest, User

load_dotenv()

app = FastAPI(title="KPI Chatbot API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://0.0.0.0:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# In-memory session storage (in production, use Redis or similar)
sessions = {}

# Predefined admin accounts
ADMIN_ACCOUNTS = {
    "admin@bank": {
        "password_hash": get_password_hash("bank123"),
        "sector": "bank",
        "role": "admin"
    },
    "admin@ithr": {
        "password_hash": get_password_hash("ithr123"),
        "sector": "ithr",
        "role": "admin"
    }
}

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return current user"""
    try:
        payload = verify_token(credentials.credentials)
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if username not in ADMIN_ACCOUNTS:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_data = ADMIN_ACCOUNTS[username]
        return User(
            username=username,
            sector=user_data["sector"],
            role=user_data["role"]
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/api/login")
async def login(request: LoginRequest):
    """Authenticate user and return JWT token"""
    try:
        username = request.username
        password = request.password
        
        if username not in ADMIN_ACCOUNTS:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_data = ADMIN_ACCOUNTS[username]
        if not verify_password(password, user_data["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Create JWT token
        token = create_access_token(
            data={
                "sub": username,
                "sector": user_data["sector"],
                "role": user_data["role"]
            }
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "username": username,
                "sector": user_data["sector"],
                "role": user_data["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/connect-db")
async def connect_database(
    request: DatabaseConnectionRequest,
    current_user: User = Depends(get_current_user)
):
    """Connect to database and extract schema"""
    try:
        db_manager = DatabaseManager()
        
        # Test connection
        connection_successful = await db_manager.test_connection(
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password
        )
        
        if not connection_successful:
            raise HTTPException(status_code=400, detail="Failed to connect to database")
        
        # Extract schema
        schema = await db_manager.extract_schema(
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password
        )
        
        # Store connection info and schema in session
        session_key = current_user.username
        sessions[session_key] = {
            "db_connection": {
                "host": request.host,
                "port": request.port,
                "database": request.database,
                "username": request.username,
                "password": request.password
            },
            "schema": schema
        }
        
        # Generate KPI suggestions based on schema and sector
        suggested_kpis = generate_kpi_suggestions(schema, current_user.sector)
        
        return {
            "status": "connected",
            "schema": schema,
            "suggested_kpis": suggested_kpis
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query-kpi")
async def query_kpi(
    request: QueryRequest,
    current_user: User = Depends(get_current_user)
):
    """Process natural language KPI query using Gemini AI"""
    try:
        session_key = current_user.username
        if session_key not in sessions:
            raise HTTPException(status_code=400, detail="No active database connection")
        
        session_data = sessions[session_key]
        db_connection = session_data["db_connection"]
        schema = session_data["schema"]
        
        # Use Gemini to generate SQL query
        gemini_service = GeminiService()
        sql_query = await gemini_service.generate_sql_query(
            natural_language_query=request.query,
            schema=schema,
            sector=current_user.sector
        )
        
        if not sql_query:
            raise HTTPException(status_code=400, detail="Could not generate valid SQL query")
        
        # Execute query safely
        db_manager = DatabaseManager()
        results = await db_manager.execute_query(
            sql_query=sql_query,
            **db_connection
        )
        
        # Format results for frontend
        formatted_results = format_query_results(results, request.query)
        
        return {
            "query": request.query,
            "sql_query": sql_query,
            "results": formatted_results,
            "execution_time": formatted_results.get("execution_time", 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/schema")
async def get_schema(current_user: User = Depends(get_current_user)):
    """Get current database schema"""
    session_key = current_user.username
    if session_key not in sessions:
        raise HTTPException(status_code=400, detail="No active database connection")
    
    return {"schema": sessions[session_key]["schema"]}

@app.post("/api/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user and clear session"""
    try:
        session_key = current_user.username
        if session_key in sessions:
            # Close database connection if exists
            session_data = sessions[session_key]
            if "db_connection" in session_data:
                db_manager = DatabaseManager()
                await db_manager.close_connection()
            
            # Clear session
            del sessions[session_key]
        
        return {"status": "logged out"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_kpi_suggestions(schema: dict, sector: str) -> list:
    """Generate KPI suggestions based on schema and sector"""
    suggestions = []
    
    # Common KPIs based on typical database structures
    if sector == "bank":
        suggestions.extend([
            {
                "id": "loan_approval_rate",
                "name": "Loan Approval Rate",
                "description": "Percentage of approved loans vs total applications",
                "query_template": "Show me the loan approval rate for the last 6 months"
            },
            {
                "id": "account_growth",
                "name": "Account Growth",
                "description": "New accounts opened over time",
                "query_template": "What's the trend in new account openings?"
            },
            {
                "id": "transaction_volume",
                "name": "Transaction Volume",
                "description": "Daily/monthly transaction volumes",
                "query_template": "Show me daily transaction volumes"
            }
        ])
    elif sector == "finance":
        suggestions.extend([
            {
                "id": "revenue_growth",
                "name": "Revenue Growth",
                "description": "Revenue growth rate over time",
                "query_template": "Show me quarterly revenue growth"
            },
            {
                "id": "profit_margins",
                "name": "Profit Margins",
                "description": "Profit margin analysis by product/service",
                "query_template": "What are the profit margins by product?"
            },
            {
                "id": "client_portfolio",
                "name": "Client Portfolio Value",
                "description": "Total client portfolio values",
                "query_template": "Show me client portfolio distributions"
            }
        ])
    elif sector == "ithr":
        suggestions.extend([
            {
                "id": "employee_turnover",
                "name": "Employee Turnover",
                "description": "Employee turnover rate by department",
                "query_template": "What's the employee turnover rate by department?"
            },
            {
                "id": "hiring_metrics",
                "name": "Hiring Metrics",
                "description": "Time to hire and hiring success rates",
                "query_template": "Show me average time to hire by position"
            },
            {
                "id": "performance_ratings",
                "name": "Performance Ratings",
                "description": "Employee performance distribution",
                "query_template": "Show me performance rating distributions"
            }
        ])
    
    # Add generic KPIs based on detected tables
    tables = schema.get("tables", {})
    for table_name, table_info in tables.items():
        columns = table_info.get("columns", {})
        
        # Look for common patterns
        if any(col in columns for col in ["amount", "total", "value", "price"]):
            suggestions.append({
                "id": f"{table_name}_totals",
                "name": f"{table_name.title()} Totals",
                "description": f"Total amounts from {table_name} table",
                "query_template": f"Show me total amounts from {table_name}"
            })
        
        if any(col in columns for col in ["date", "created_at", "timestamp"]):
            suggestions.append({
                "id": f"{table_name}_trends",
                "name": f"{table_name.title()} Trends",
                "description": f"Trends over time from {table_name} table",
                "query_template": f"Show me {table_name} trends over time"
            })
    
    return suggestions[:8]  # Limit to 8 suggestions

def format_query_results(results: dict, original_query: str) -> dict:
    """Format query results for frontend display"""
    if not results or "data" not in results:
        return {
            "table_data": [],
            "chart_data": {},
            "columns": [],
            "row_count": 0,
            "execution_time": results.get("execution_time", 0)
        }
    
    data = results["data"]
    columns = results.get("columns", [])
    
    # Prepare table data
    table_data = []
    for row in data:
        if isinstance(row, (list, tuple)):
            row_dict = {columns[i] if i < len(columns) else f"col_{i}": val for i, val in enumerate(row)}
        else:
            row_dict = dict(row)
        table_data.append(row_dict)
    
    # Prepare chart data (simple format for recharts)
    chart_data = {
        "type": "bar",  # Default to bar chart
        "data": table_data[:50],  # Limit for performance
        "xAxis": columns[0] if columns else "x",
        "yAxis": columns[1] if len(columns) > 1 else "y"
    }
    
    # Auto-detect chart type based on data
    if len(columns) >= 2:
        # Check if first column looks like a date/time
        first_col_values = [row.get(columns[0]) for row in table_data[:5]]
        if any(isinstance(val, (str,)) and any(date_keyword in str(val).lower() for date_keyword in ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', '2023', '2024']) for val in first_col_values):
            chart_data["type"] = "line"
    
    return {
        "table_data": table_data,
        "chart_data": chart_data,
        "columns": columns,
        "row_count": len(table_data),
        "execution_time": results.get("execution_time", 0)
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
