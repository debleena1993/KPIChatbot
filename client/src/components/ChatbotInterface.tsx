import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { chatAPI, databaseAPI } from "@/lib/api";
import { User, Schema, KPISuggestion, ChatMessage } from "@/types";
import { 
  Bot, 
  User as UserIcon, 
  Send, 
  ArrowLeft, 
  Database, 
  BarChart3, 
  LogOut,
  Trash2,
  Copy,
  Download
} from "lucide-react";
import ResultsDisplay from "./ResultsDisplay";

interface ChatbotInterfaceProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  suggestedKPIs?: KPISuggestion[];
}

export default function ChatbotInterface({ user, onBack, onLogout, suggestedKPIs: initialKPIs }: ChatbotInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [suggestedKPIs, setSuggestedKPIs] = useState<KPISuggestion[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load schema and add welcome message
    loadSchema();
    addWelcomeMessage();
    
    // If we have initial KPIs from database connection, use them
    if (initialKPIs && initialKPIs.length > 0) {
      setSuggestedKPIs(initialKPIs);
    }
  }, [initialKPIs]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadSchema = async () => {
    try {
      const response = await databaseAPI.getSchema();
      setSchema(response.schema);
      
      // Only generate hardcoded suggestions if we don't have AI-generated ones
      if (!initialKPIs || initialKPIs.length === 0) {
        generateKPISuggestions(response.schema);
      }
    } catch (error) {
      toast({
        title: "Failed to load schema",
        description: "Could not load database schema. Please reconnect.",
        variant: "destructive"
      });
    }
  };

  const generateKPISuggestions = (schema: Schema) => {
    const suggestions: KPISuggestion[] = [];
    
    // Generate suggestions based on sector and available tables
    const tables = Object.keys(schema.tables);
    
    if (user.sector === "bank") {
      suggestions.push(
        { id: "account_balance", name: "Account Balances", description: "Total account balances by type", query_template: "Show me account balances by account type" },
        { id: "transaction_volume", name: "Transaction Volume", description: "Daily transaction volumes", query_template: "Show me daily transaction volumes for the last month" },
        { id: "loan_performance", name: "Loan Performance", description: "Loan approval rates and amounts", query_template: "What's the loan approval rate this quarter?" }
      );
    } else if (user.sector === "finance") {
      suggestions.push(
        { id: "revenue_trends", name: "Revenue Trends", description: "Revenue trends over time", query_template: "Show me quarterly revenue trends" },
        { id: "client_portfolio", name: "Client Portfolio", description: "Client portfolio values", query_template: "Show me client portfolio distribution" },
        { id: "profit_margins", name: "Profit Margins", description: "Profit margins by service", query_template: "What are the profit margins by service type?" }
      );
    } else if (user.sector === "ithr") {
      suggestions.push(
        { id: "employee_count", name: "Employee Count", description: "Employee headcount by department", query_template: "Show me employee count by department" },
        { id: "salary_analysis", name: "Salary Analysis", description: "Average salary by role", query_template: "What's the average salary by job title?" },
        { id: "performance_ratings", name: "Performance Ratings", description: "Employee performance distribution", query_template: "Show me performance rating distributions" }
      );
    }

    // Add generic suggestions based on table names
    tables.forEach(tableName => {
      suggestions.push({
        id: `${tableName}_summary`,
        name: `${tableName.charAt(0).toUpperCase() + tableName.slice(1)} Summary`,
        description: `Summary statistics from ${tableName} table`,
        query_template: `Show me a summary of ${tableName} data`
      });
    });

    setSuggestedKPIs(suggestions.slice(0, 8));
  };

  const addWelcomeMessage = () => {
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "assistant",
      content: "Hello! I'm your KPI assistant. I can help you analyze your data using natural language queries. Try asking something like 'Show me monthly sales for the last 6 months' or 'What's the average salary by department?'",
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const result = await chatAPI.queryKPI(inputMessage.trim());
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Here are the results for your query: "${userMessage.content}"`,
        timestamp: new Date(),
        results: result
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `I'm sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your query or check your database connection.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Query failed",
        description: error instanceof Error ? error.message : "Could not process your query",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuery = (query: string) => {
    setInputMessage(query);
  };

  const clearChat = () => {
    setMessages([]);
    addWelcomeMessage();
  };

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'bank': return 'text-green-600';
      case 'finance': return 'text-purple-600';
      case 'ithr': return 'text-orange-600';
      default: return 'text-blue-600';
    }
  };

  const getSectorName = (sector: string) => {
    switch (sector) {
      case 'bank': return 'Banking';
      case 'finance': return 'Finance';
      case 'ithr': return 'IT HR Portal';
      default: return sector;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-back"
              onClick={onBack}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="bg-blue-600 text-white w-10 h-10 rounded-lg flex items-center justify-center mr-3">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">KPI Chatbot</h1>
              <p className="text-sm text-gray-600">
                Connected to database • 
                <span className="text-green-600 ml-1">
                  <span className="inline-block w-1 h-1 bg-green-600 rounded-full mr-1"></span>
                  Online
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-toggle-schema"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <Database className="mr-2 h-4 w-4" />
              Schema
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-logout-chat"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
            {/* Schema Panel */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Database className="mr-2 h-4 w-4 text-blue-600" />
                Database Schema
              </h3>
              
              {schema && (
                <div className="space-y-2 text-sm">
                  {Object.entries(schema.tables).map(([tableName, tableInfo]) => (
                    <div key={tableName} className="p-2 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-800 mb-1">{tableName}</div>
                      <div className="text-xs text-gray-600 ml-2 space-y-1">
                        {Object.entries(tableInfo.columns).slice(0, 5).map(([colName, colInfo]) => (
                          <div key={colName}>• {colName} ({colInfo.type})</div>
                        ))}
                        {Object.keys(tableInfo.columns).length > 5 && (
                          <div className="text-gray-500">... and {Object.keys(tableInfo.columns).length - 5} more</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KPI Panel */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <BarChart3 className="mr-2 h-4 w-4 text-blue-600" />
                Suggested KPIs
              </h3>
              
              <div className="space-y-2 text-sm">
                {suggestedKPIs.map((kpi) => (
                  <button
                    key={kpi.id}
                    data-testid={`kpi-suggestion-${kpi.id}`}
                    onClick={() => handleQuickQuery(kpi.query_template)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors group"
                  >
                    <div className="font-medium text-gray-800 group-hover:text-blue-600">{kpi.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{kpi.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                data-testid={`message-${message.type}-${message.id}`}
                className={`flex items-start space-x-3 ${
                  message.type === "user" ? "justify-end" : ""
                }`}
              >
                {message.type === "assistant" && (
                  <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-3xl ${
                    message.type === "user"
                      ? "bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none"
                      : "bg-white p-4 rounded-2xl rounded-tl-none shadow-lg"
                  }`}
                >
                  <p className={message.type === "user" ? "text-white" : "text-gray-800"}>
                    {message.content}
                  </p>
                  
                  {message.results && (
                    <div className="mt-4">
                      <ResultsDisplay results={message.results} />
                    </div>
                  )}
                </div>

                {message.type === "user" && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getSectorColor(user.sector).replace('text-', 'bg-')} text-white`}>
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Processing your query...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <div className="relative">
                    <Textarea
                      data-testid="input-chat-message"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask me anything about your KPIs... (e.g., 'Show monthly revenue trends' or 'Which department has the highest average salary?')"
                      className="w-full p-4 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none min-h-[60px] max-h-32"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      data-testid="button-send-message"
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="absolute right-3 bottom-3 bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 p-0 rounded-full"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs text-gray-500">Quick actions:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="quick-action-monthly-sales"
                      onClick={() => handleQuickQuery("Show me monthly sales")}
                      className="text-xs h-6"
                    >
                      Monthly Sales
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="quick-action-top-customers"
                      onClick={() => handleQuickQuery("Show me top customers")}
                      className="text-xs h-6"
                    >
                      Top Customers
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="quick-action-dept-average"
                      onClick={() => handleQuickQuery("Show me department averages")}
                      className="text-xs h-6"
                    >
                      Dept. Average
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-clear-chat"
                  onClick={clearChat}
                  className="h-12"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
