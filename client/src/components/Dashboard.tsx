import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Database, Shield, Bot, LogOut, Activity } from "lucide-react";
import { User, KPISuggestion } from "@/types";
import DatabaseModal from "./DatabaseModal";
import DatabaseConfig from "./DatabaseConfig";

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onDatabaseConnected: (kpiSuggestions?: KPISuggestion[]) => void;
}

export default function Dashboard({ user, onLogout, onDatabaseConnected }: DashboardProps) {
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

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
      case 'bank': return 'Banking Sector';
      case 'finance': return 'Finance Sector';
      case 'ithr': return 'HR Portal';
      default: return sector;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-lg flex items-center justify-center mr-3">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">KPI Analytics Hub</h1>
              <p className="text-sm text-gray-600">
                <span className={`font-medium ${getSectorColor(user.sector)}`}>
                  {getSectorName(user.sector)}
                </span> • 
                <span className="ml-1">{user.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">{user.username}</span>
            </div>

            <Button 
              variant="ghost" 
              size="sm"
              data-testid="button-logout"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Welcome Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to your Dashboard</h2>
            <p className="text-gray-600 mb-6">Connect to your database to start analyzing KPIs with our AI-powered chatbot.</p>

            {/* Database Connection Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Database Connection</h3>
                  <p className="text-blue-100">Connect to your database to enable KPI analysis</p>
                </div>
                <Button 
                  data-testid="button-connect-database"
                  onClick={() => setIsDatabaseModalOpen(true)}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Connect Database
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Shield className="text-green-600 h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Access</h3>
              <p className="text-gray-600 text-sm">JWT-based authentication with bcrypt password hashing for enterprise security.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Bot className="text-purple-600 h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Queries</h3>
              <p className="text-gray-600 text-sm">Natural language KPI queries powered by Google Gemini with schema awareness.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="bg-orange-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="text-orange-600 h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Visual Analytics</h3>
              <p className="text-gray-600 text-sm">Interactive charts and tables with customizable views for comprehensive data analysis.</p>
            </CardContent>
          </Card>
        </div>

        {/* Database Configuration */}
        <div className="mb-6">
          <DatabaseConfig />
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                    <LogOut className="text-blue-600 h-4 w-4 rotate-180" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">User Login</div>
                    <div className="text-sm text-gray-600">{getSectorName(user.sector)} access granted</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Just now</div>
              </div>

              <div className="text-center text-gray-500 text-sm py-8">
                No database connections yet. Connect to start tracking activity.
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Database Connection Modal */}
      <DatabaseModal 
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onSuccess={(kpiSuggestions) => {
          setIsDatabaseModalOpen(false);
          onDatabaseConnected(kpiSuggestions);
        }}
      />
    </div>
  );
}
