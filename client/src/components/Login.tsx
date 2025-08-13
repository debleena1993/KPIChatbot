import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authAPI, setAuthToken } from "@/lib/api";
import { LoginCredentials, User } from "@/types";
import { BarChart3, Building2, PieChart, Users, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

interface LoginProps {
  onLogin: (token: string, user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [selectedSector, setSelectedSector] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const sectors = [
    {
      id: "bank",
      name: "Banking",
      description: "Financial Institution Dashboard",
      icon: Building2,
      color: "bg-green-600 hover:bg-green-700",
      hoverBg: "hover:bg-green-50",
      borderColor: "hover:border-green-600"
    },
    {
      id: "finance", 
      name: "Finance",
      description: "Financial Services Analytics",
      icon: PieChart,
      color: "bg-purple-600 hover:bg-purple-700",
      hoverBg: "hover:bg-purple-50",
      borderColor: "hover:border-purple-600"
    },
    {
      id: "ithr",
      name: "IT HR Portal", 
      description: "Human Resources Management",
      icon: Users,
      color: "bg-orange-600 hover:bg-orange-700",
      hoverBg: "hover:bg-orange-50",
      borderColor: "hover:border-orange-600"
    }
  ];

  const handleSubmit = async (data: LoginCredentials) => {
    if (!selectedSector) {
      toast({
        title: "Select a sector",
        description: "Please select your sector before logging in",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.login(data);
      
      setAuthToken(response.access_token);
      onLogin(response.access_token, response.user);
      
      toast({
        title: "Login successful!",
        description: "Welcome to KPI Analytics Hub"
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Analytics Hub</h1>
          <p className="text-gray-600 mt-2">Multi-Sector AI-Powered Dashboard</p>
        </CardHeader>

        <CardContent>
          {/* Sector Selection */}
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Select Your Sector</Label>
            <div className="space-y-3">
              {sectors.map((sector) => (
                <button
                  key={sector.id}
                  data-testid={`sector-${sector.id}`}
                  onClick={() => setSelectedSector(sector.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                    selectedSector === sector.id 
                      ? 'border-blue-600 bg-blue-50' 
                      : `border-gray-200 ${sector.hoverBg} ${sector.borderColor}`
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`text-white w-10 h-10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform ${sector.color}`}>
                      <sector.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{sector.name}</div>
                      <div className="text-sm text-gray-600">{sector.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                {...form.register("username")}
                placeholder="Enter your username"
                className="h-12"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-600">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")}
                  placeholder="Enter your password"
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  data-testid="button-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              data-testid="button-login"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="text-xs font-medium text-gray-700 mb-2">Demo Credentials:</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Bank: admin@bank / bank123</div>
              <div>Finance: admin@finance / finance123</div>
              <div>IT HR: admin@ithr / ithr123</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
