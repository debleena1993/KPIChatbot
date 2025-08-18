"""
LangGraph Chart Intelligence Agent for KPI Visualization
Provides intelligent chart type selection and visualization recommendations
"""

import json
import os
from typing import Dict, List, Any, Optional
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI


class ChartIntelligenceAgent:
    def __init__(self):
        self.model = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.1
        )
        self.agent = self._create_agent()

    def _create_agent(self):
        """Create the LangGraph agent with chart intelligence tools"""
        
        @tool
        def analyze_data_for_chart_type(data: List[Dict], columns: List[str]) -> Dict:
            """Analyze data structure to recommend optimal chart type and configuration"""
            if not data or not columns:
                return {"chart_type": "table", "reason": "No data available"}
            
            # Analyze data characteristics
            num_rows = len(data)
            num_cols = len(columns)
            
            # Check data types and patterns
            numeric_cols = []
            categorical_cols = []
            date_cols = []
            
            for col in columns:
                sample_values = [row.get(col) for row in data[:5] if row.get(col) is not None]
                if not sample_values:
                    continue
                    
                # Check if numeric
                try:
                    [float(v) for v in sample_values if v is not None]
                    numeric_cols.append(col)
                except (ValueError, TypeError):
                    # Check if date-like
                    if any(word in col.lower() for word in ['date', 'time', 'month', 'year', 'day']):
                        date_cols.append(col)
                    else:
                        categorical_cols.append(col)
            
            # Intelligent chart type selection
            if len(numeric_cols) >= 2 and len(categorical_cols) >= 1:
                return {
                    "chart_type": "bar",
                    "x_axis": categorical_cols[0],
                    "y_axis": numeric_cols[0],
                    "reason": "Multiple numeric values with categories - ideal for bar chart comparison"
                }
            elif len(date_cols) >= 1 and len(numeric_cols) >= 1:
                return {
                    "chart_type": "line",
                    "x_axis": date_cols[0],
                    "y_axis": numeric_cols[0],
                    "reason": "Time series data detected - line chart shows trends over time"
                }
            elif len(categorical_cols) >= 1 and len(numeric_cols) >= 1 and num_rows <= 10:
                return {
                    "chart_type": "pie",
                    "x_axis": categorical_cols[0],
                    "y_axis": numeric_cols[0],
                    "reason": "Small dataset with categories - pie chart shows proportions effectively"
                }
            elif len(numeric_cols) >= 1 and len(categorical_cols) >= 1:
                return {
                    "chart_type": "bar",
                    "x_axis": categorical_cols[0],
                    "y_axis": numeric_cols[0],
                    "reason": "Categorical data with numeric values - bar chart for clear comparison"
                }
            else:
                return {
                    "chart_type": "table",
                    "reason": "Data structure is best represented in tabular format"
                }

        @tool
        def enhance_chart_config(chart_type: str, data: List[Dict], context: str) -> Dict:
            """Enhance chart configuration with intelligent styling and options"""
            base_config = {
                "colors": ["#FD5108", "#FE7C39", "#FFAA72", "#A1A8B3", "#B5BCC4"],  # PWC palette
                "animations": True,
                "responsive": True
            }
            
            if chart_type == "line":
                return {
                    **base_config,
                    "curve": "smooth",
                    "markers": len(data) <= 20,  # Show markers for smaller datasets
                    "gradient": True,
                    "grid": True
                }
            elif chart_type == "bar":
                return {
                    **base_config,
                    "orientation": "horizontal" if len(data) > 10 else "vertical",
                    "border_radius": 4,
                    "shadow": True
                }
            elif chart_type == "pie":
                return {
                    **base_config,
                    "donut": len(data) > 5,  # Use donut for more categories
                    "labels": True,
                    "legend_position": "right"
                }
            
            return base_config

        @tool
        def generate_chart_insights(data: List[Dict], chart_type: str, query_context: str) -> Dict:
            """Generate intelligent insights about the data visualization"""
            if not data:
                return {"insights": []}
            
            insights = []
            
            # Basic data analysis
            num_records = len(data)
            insights.append(f"Dataset contains {num_records} records")
            
            # Find numeric columns for analysis
            numeric_data = {}
            for row in data:
                for key, value in row.items():
                    try:
                        float_val = float(value)
                        if key not in numeric_data:
                            numeric_data[key] = []
                        numeric_data[key].append(float_val)
                    except (ValueError, TypeError):
                        continue
            
            # Generate insights for numeric data
            for col, values in numeric_data.items():
                if len(values) > 1:
                    avg_val = sum(values) / len(values)
                    max_val = max(values)
                    min_val = min(values)
                    
                    if max_val > avg_val * 2:
                        insights.append(f"High variance detected in {col} - maximum value ({max_val:,.0f}) is significantly above average ({avg_val:,.0f})")
                    
                    if chart_type == "line" and len(values) > 2:
                        # Simple trend analysis
                        if values[-1] > values[0]:
                            trend = "increasing"
                        elif values[-1] < values[0]:
                            trend = "decreasing"
                        else:
                            trend = "stable"
                        insights.append(f"{col} shows a {trend} trend over the time period")
            
            return {
                "insights": insights,
                "data_quality": "good" if numeric_data else "limited",
                "recommendation": f"This {chart_type} chart effectively visualizes the {query_context.lower()} data"
            }

        # Create the agent with correct parameters
        from langgraph.graph import StateGraph
        from typing import TypedDict
        
        class ChartState(TypedDict):
            messages: list
            data: list
            columns: list
            context: str
            recommendation: dict
        
        def analyze_node(state: ChartState):
            # Analyze data for chart recommendations
            data = state.get("data", [])
            columns = state.get("columns", [])
            
            # Use the tools directly
            chart_analysis = analyze_data_for_chart_type.invoke({
                "data": data, 
                "columns": columns
            })
            
            config_enhancement = enhance_chart_config.invoke({
                "chart_type": chart_analysis.get("chart_type", "bar"),
                "data": data,
                "context": state.get("context", "")
            })
            
            insights = generate_chart_insights.invoke({
                "data": data,
                "chart_type": chart_analysis.get("chart_type", "bar"),
                "query_context": state.get("context", "")
            })
            
            return {
                **state,
                "recommendation": {
                    **chart_analysis,
                    "config": config_enhancement,
                    "insights": insights
                }
            }
        
        # Create simple workflow
        workflow = StateGraph(ChartState)
        workflow.add_node("analyze", analyze_node)
        workflow.set_entry_point("analyze")
        workflow.set_finish_point("analyze")
        
        agent = workflow.compile()
        
        return agent

    def get_intelligent_chart_config(self, data: List[Dict], columns: List[str], query_context: str = "") -> Dict:
        """Get intelligent chart configuration recommendations"""
        try:
            # Invoke the LangGraph workflow
            result = self.agent.invoke({
                "messages": [],
                "data": data,
                "columns": columns,
                "context": query_context,
                "recommendation": {}
            })
            
            # Extract the recommendation from the workflow result
            recommendation = result.get("recommendation", {})
            
            return {
                "chart_type": recommendation.get("chart_type", "bar"),
                "x_axis": recommendation.get("x_axis", columns[0] if columns else ""),
                "y_axis": recommendation.get("y_axis", columns[1] if len(columns) > 1 else columns[0] if columns else ""),
                "reason": recommendation.get("reason", "Intelligent analysis completed"),
                "enhanced_by_langgraph": True,
                "config": recommendation.get("config", {}),
                "insights": recommendation.get("insights", {}),
                "data_analysis": {
                    "total_rows": len(data),
                    "columns_analyzed": len(columns)
                }
            }
            
        except Exception as e:
            print(f"LangGraph agent error: {e}")
            return self._fallback_chart_config(data, columns)

    def _parse_agent_response(self, response: str, data: List[Dict], columns: List[str]) -> Dict:
        """Parse agent response and extract chart configuration"""
        
        # Default intelligent configuration based on data analysis
        config = self._fallback_chart_config(data, columns)
        
        # Enhanced parsing could be implemented here to extract more sophisticated
        # recommendations from the agent's natural language response
        
        # For now, add the agent's insights as additional context
        config["agent_insights"] = response
        config["enhanced_by_langgraph"] = True
        
        return config

    def _fallback_chart_config(self, data: List[Dict], columns: List[str]) -> Dict:
        """Intelligent fallback chart configuration"""
        if not data or not columns:
            return {
                "chart_type": "table",
                "reason": "No data available for visualization"
            }
        
        # Analyze data characteristics
        numeric_cols = []
        categorical_cols = []
        date_cols = []
        
        for col in columns:
            sample_values = [row.get(col) for row in data[:5] if row.get(col) is not None]
            if not sample_values:
                continue
                
            # Check if numeric
            try:
                [float(v) for v in sample_values if v is not None]
                numeric_cols.append(col)
            except (ValueError, TypeError):
                if any(word in col.lower() for word in ['date', 'time', 'month', 'year', 'day']):
                    date_cols.append(col)
                else:
                    categorical_cols.append(col)
        
        # Intelligent chart type selection
        if len(date_cols) >= 1 and len(numeric_cols) >= 1:
            chart_type = "line"
            x_axis = date_cols[0]
            y_axis = numeric_cols[0]
        elif len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
            if len(data) <= 8:
                chart_type = "pie"
            else:
                chart_type = "bar"
            x_axis = categorical_cols[0]
            y_axis = numeric_cols[0]
        else:
            chart_type = "bar"
            x_axis = columns[0] if columns else ""
            y_axis = columns[1] if len(columns) > 1 else columns[0]
        
        return {
            "chart_type": chart_type,
            "x_axis": x_axis,
            "y_axis": y_axis,
            "colors": ["#FD5108", "#FE7C39", "#FFAA72", "#A1A8B3", "#B5BCC4"],
            "enhanced_by_langgraph": False,
            "data_analysis": {
                "numeric_columns": numeric_cols,
                "categorical_columns": categorical_cols,
                "date_columns": date_cols,
                "total_rows": len(data)
            }
        }


# Global instance
chart_agent = ChartIntelligenceAgent()

def get_intelligent_chart_recommendation(data: List[Dict], columns: List[str], query_context: str = "") -> Dict:
    """Main function to get intelligent chart recommendations"""
    return chart_agent.get_intelligent_chart_config(data, columns, query_context)