from pydantic import BaseModel
from typing import Optional, Dict, Any

class LoginRequest(BaseModel):
    username: str
    password: str

class DatabaseConnectionRequest(BaseModel):
    host: str
    port: int
    database: str
    username: str
    password: str

class QueryRequest(BaseModel):
    query: str

class User(BaseModel):
    username: str
    sector: str
    role: str

class QueryResult(BaseModel):
    query: str
    sql_query: str
    results: Dict[str, Any]
    execution_time: float
