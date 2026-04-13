import { useState } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import ConsentScreen from "@/components/ConsentScreen";
import LoginScreen from "@/components/LoginScreen";
import SignupScreen from "@/components/SignupScreen";
import Dashboard from "@/components/Dashboard";
import DatasetCollectionScreen from "@/components/DatasetCollectionScreen";
import { toast } from "sonner";
import { apiLogin, apiSignup, apiLogout } from "@/lib/api";

type Screen = "welcome" | "consent" | "login" | "signup" | "dataset" | "dashboard";
interface User { id: string; username: string; email: string; sex: string; }

const Index = () => {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = async (email: string, password: string) => {
    try {
      const data = await apiLogin(email, password);
      setUser({ id: data.user_id, username: data.username, email, sex: data.sex });
      toast.success(`¡Bienvenido, ${data.username}!`);
      setScreen("dashboard");
    } catch (e: any) { toast.error(e.message || "Error al iniciar sesión"); }
  };

  const handleSignup = async (data: { email: string; username: string; password: string; sex: string }) => {
    try {
      const res = await apiSignup(data);
      setUser({ id: res.user_id, username: res.username, email: data.email, sex: data.sex });
      toast.success(`¡Cuenta creada! Bienvenido, ${res.username} 🎤`);
      setScreen("consent");
    } catch (e: any) { toast.error(e.message || "Error al crear cuenta"); }
  };

  const handleLogout = () => { apiLogout(); setUser(null); setScreen("welcome"); toast.info("Sesión cerrada"); };

  switch (screen) {
    case "welcome": return <WelcomeScreen onContinue={() => setScreen("dataset")} onLogin={() => setScreen("login")} onSignup={() => setScreen("signup")} />;
    case "dataset": return <DatasetCollectionScreen onBack={() => setScreen("welcome")} />;
    case "consent": return <ConsentScreen onAccept={() => setScreen("dashboard")} onBack={() => setScreen("welcome")} />;
    case "login": return <LoginScreen onLogin={handleLogin} onBack={() => setScreen("welcome")} onForgotPassword={() => toast.info("Enlace enviado.")} onGoToSignup={() => setScreen("signup")} />;
    case "signup": return <SignupScreen onSignup={handleSignup} onBack={() => setScreen("welcome")} onGoToLogin={() => setScreen("login")} />;
    case "dashboard": return user ? <Dashboard username={user.username} sex={user.sex} onLogout={handleLogout} /> : <WelcomeScreen onContinue={() => setScreen("dataset")} onLogin={() => setScreen("login")} onSignup={() => setScreen("signup")} />;
    default: return null;
  }
};

export default Index;
