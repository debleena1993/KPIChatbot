import psycopg2
import asyncio
from typing import Dict, Any, List, Optional
import time
from contextlib import asynccontextmanager

class DatabaseManager:
    def __init__(self):
        self.connection = None

    async def test_connection(self, host: str, port: int, database: str, username: str, password: str) -> bool:
        """Test database connection"""
        try:
            connection = psycopg2.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password,
                connect_timeout=10
            )
            connection.close()
            return True
        except Exception as e:
            print(f"Database connection test failed: {e}")
            return False

    async def extract_schema(self, host: str, port: int, database: str, username: str, password: str) -> Dict[str, Any]:
        """Extract database schema information"""
        try:
            connection = psycopg2.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password
            )
            cursor = connection.cursor()
            
            # Get all tables
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
            """)
            tables = cursor.fetchall()
            
            schema = {"tables": {}}
            
            for (table_name,) in tables:
                # Get columns for each table
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = %s 
                    AND table_schema = 'public'
                    ORDER BY ordinal_position
                """, (table_name,))
                
                columns = cursor.fetchall()
                
                schema["tables"][table_name] = {
                    "columns": {
                        col_name: {
                            "type": data_type,
                            "nullable": is_nullable == "YES",
                            "default": column_default
                        }
                        for col_name, data_type, is_nullable, column_default in columns
                    }
                }
            
            connection.close()
            return schema
            
        except Exception as e:
            print(f"Schema extraction failed: {e}")
            return {"tables": {}}

    async def execute_query(self, sql_query: str, host: str, port: int, database: str, username: str, password: str) -> Dict[str, Any]:
        """Execute SQL query safely with parameterization"""
        try:
            start_time = time.time()
            
            connection = psycopg2.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password
            )
            
            cursor = connection.cursor()
            
            # Execute the query
            cursor.execute(sql_query)
            
            # Fetch results
            results = cursor.fetchall()
            column_names = [desc[0] for desc in cursor.description] if cursor.description else []
            
            execution_time = time.time() - start_time
            
            connection.close()
            
            return {
                "data": results,
                "columns": column_names,
                "execution_time": round(execution_time, 3)
            }
            
        except Exception as e:
            print(f"Query execution failed: {e}")
            return {
                "error": str(e),
                "data": [],
                "columns": [],
                "execution_time": 0
            }

    async def close_connection(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
