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
import {
  BarChart3,
  Building2,
  PieChart,
  Users,
  Eye,
  EyeOff,
  Bot,
  Shield,
} from "lucide-react";
import pwcLogo from "@assets/PwC_fl_c.png";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
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
      password: "",
    },
  });

  const sectors = [
    {
      id: "bank",
      name: "Banking",
      description: "Financial Institution Dashboard",
      icon: Building2,
      color: "bg-[#FD5108] hover:bg-[#E8490A]",
      hoverBg: "hover:bg-[#FFF5ED]",
      borderColor: "hover:border-[#FD5108]",
    },
    {
      id: "ithr",
      name: "HR Portal",
      description: "Human Resources Management",
      icon: Users,
      color: "bg-[#FE7C39] hover:bg-[#E8490A]",
      hoverBg: "hover:bg-[#FFE8D4]",
      borderColor: "hover:border-[#FE7C39]",
    },
  ];

  // Demo credentials mapping
  const demoCredentials: Record<
    string,
    { username: string; password: string }
  > = {
    bank: { username: "admin@bank", password: "bank123" },
    ithr: { username: "admin@ithr", password: "ithr123" },
  };

  const handleSectorSelect = (sectorId: string) => {
    setSelectedSector(sectorId);

    // Auto-fill demo credentials for selected sector
    const credentials = demoCredentials[sectorId];
    if (credentials) {
      form.setValue("username", credentials.username);
      form.setValue("password", credentials.password);
    }
  };

  const handleSubmit = async (data: LoginCredentials) => {
    if (!selectedSector) {
      toast({
        title: "Select a sector",
        description: "Please select your sector before logging in",
        variant: "destructive",
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
        description: "Welcome to KPI Analytics Hub",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description:
          error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5ED] via-white to-[#FFE8D4] flex items-center justify-center p-4">
      <Card className="w-full max-h-[100vh] max-w-6xl shadow-2xl border-[#DFE3E6] overflow-hidden">
        <div className="flex min-h-[600px]">
          {/* Left Side - Branding & Information */}
          <div className="flex-1 bg-gradient-to-br from-[#FD5108] to-[#E8490A] p-12 flex flex-col justify-center text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full"></div>
              <div className="absolute bottom-20 right-10 w-24 h-24 border-2 border-white rounded-full"></div>
              <div className="absolute top-1/2 right-20 w-16 h-16 border border-white rounded-full"></div>
            </div>

            <div className="relative z-10">
              <div className="mb-8">
                <img
                  src={pwcLogo}
                  alt="PWC Logo"
                  className="h-16 w-auto object-contain mb-6 filter brightness-0 invert"
                />
              </div>

              <h1 className="text-4xl font-bold mb-4 leading-tight">
                KPI Analytics Portal
              </h1>

              <p className="text-[#FFE8D4] text-lg mb-8 leading-relaxed">
                Unlock powerful insights with AI-driven analytics.
                <br />
                Transform your data into actionable business intelligence.
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="bg-white/20 p-2 rounded-lg mr-4">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <span className="text-[#FFE8D4]">
                    Real-time KPI monitoring
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="bg-white/20 p-2 rounded-lg mr-4">
                    <Bot className="h-5 w-5" />
                  </div>
                  <span className="text-[#FFE8D4]">
                    AI-powered natural language queries
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="bg-white/20 p-2 rounded-lg mr-4">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="text-[#FFE8D4]">
                    Enterprise-grade security
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex-1 p-12 flex flex-col justify-center bg-white">
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">
                  Welcome Back
                </h2>
                <p className="text-[#A1A8B3]">
                  Select your sector and sign in to continue
                </p>
              </div>

              {/* Sector Selection */}
              <div className="mb-8">
                <Label className="text-sm font-medium text-[#1A1A1A] mb-4 block">
                  Choose Your Sector
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {sectors.map((sector) => (
                    <button
                      key={sector.id}
                      data-testid={`sector-${sector.id}`}
                      onClick={() => handleSectorSelect(sector.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                        selectedSector === sector.id
                          ? "border-[#FD5108] bg-[#FFF5ED] shadow-[0_0_0_3px_rgba(253,81,8,0.1)]"
                          : `border-[#DFE3E6] ${sector.hoverBg} ${sector.borderColor}`
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`text-white w-12 h-12 rounded-xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform ${sector.color}`}
                        >
                          <sector.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-semibold text-[#1A1A1A] text-lg">
                            {sector.name}
                          </div>
                          <div className="text-sm text-[#A1A8B3]">
                            {sector.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Login Form */}
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-[#1A1A1A] font-medium"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    data-testid="input-username"
                    {...form.register("username")}
                    placeholder="Enter your username"
                    className="h-12 border-[#DFE3E6] focus:border-[#FD5108] focus:ring-[#FD5108]"
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-[#1A1A1A] font-medium"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      data-testid="input-password"
                      type={showPassword ? "text" : "password"}
                      {...form.register("password")}
                      placeholder="Enter your password"
                      className="h-12 pr-10 border-[#DFE3E6] focus:border-[#FD5108] focus:ring-[#FD5108]"
                    />
                    <button
                      type="button"
                      data-testid="button-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#A1A8B3] hover:text-[#1A1A1A]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  data-testid="button-login"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#FD5108] hover:bg-[#E8490A] font-semibold text-white border-0 shadow-[0_4px_6px_rgba(253,81,8,0.1)] text-lg"
                >
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="mt-8 p-4 bg-[#F5F7F8] rounded-xl border border-[#DFE3E6]">
                <div className="text-xs font-medium text-[#1A1A1A] mb-2">
                  Demo Credentials:
                </div>
                <div className="text-xs text-[#A1A8B3] space-y-1">
                  <div>
                    <span className="font-medium">Banking:</span> admin@bank /
                    bank123
                  </div>
                  <div>
                    <span className="font-medium">HR:</span> admin@ithr /
                    ithr123
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
