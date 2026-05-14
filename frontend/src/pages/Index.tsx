import { useState } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import LoginScreen from "@/components/LoginScreen";
import SignupScreen from "@/components/SignupScreen";
import Dashboard from "@/components/Dashboard";
import VoiceAnalysisScreen from "@/components/VoiceAnalysisScreen";
import ForgotPasswordScreen from "@/components/ForgotPasswordScreen";
import ResetPasswordScreen from "@/components/ResetPasswordScreen";
import { toast } from "sonner";
import { apiLogin, apiSignup, apiLogout, type SongResult, type VoiceRange } from "@/lib/api";

type Screen = "welcome" | "login" | "signup" | "dashboard" | "analyze" | "forgot-password" | "reset-password";

interface User {
  id:         string;
  username:   string;
  email:      string;
  sex:        string;
  photo:      string | null;
  bio:        string;
  voiceRange: VoiceRange | null;
}

interface ShareData {
  songs:    SongResult[];
  minFreq:  number;
  maxFreq:  number;
  baseFreq: number;
}

// Detecta si la URL contiene un token de restablecimiento de contraseña
function getInitialScreen(): Screen {
  const params = new URLSearchParams(window.location.search);
  if (params.get("action") === "reset" && params.get("token")) return "reset-password";
  return "welcome";
}
function getResetToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("action") === "reset" ? params.get("token") : null;
}

const Index = () => {
  const [screen,       setScreen]       = useState<Screen>(getInitialScreen);
  const [user,         setUser]         = useState<User | null>(null);
  const [pendingShare, setPendingShare] = useState<ShareData | null>(null);
  const [resetToken]                    = useState<string | null>(getResetToken);

  const handleLogin = async (email: string, password: string) => {
    try {
      const data = await apiLogin(email, password);
      setUser({ id: data.user_id, username: data.username, email, sex: data.sex, photo: data.photo ?? null, bio: data.bio ?? "", voiceRange: data.voice_range ?? null });
      toast.success(`¡Bienvenido, ${data.username}!`);
      setScreen("dashboard");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al iniciar sesión");
    }
  };

  const handleSignup = async (data: { email: string; username: string; password: string; sex: string }) => {
    try {
      const res = await apiSignup(data);
      setUser({ id: res.user_id, username: res.username, email: data.email, sex: data.sex, photo: res.photo ?? null, bio: "", voiceRange: null });
      toast.success(`¡Cuenta creada! Bienvenido, ${res.username}`);
      setScreen("dashboard");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear cuenta");
    }
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    setPendingShare(null);
    setScreen("welcome");
    toast.info("Sesión cerrada");
  };

  const handleProfileUpdate = (username: string, photo: string | null, bio: string, voiceRange?: VoiceRange | null) => {
    setUser((prev) => prev ? {
      ...prev,
      username,
      photo,
      bio,
      voiceRange: voiceRange !== undefined ? voiceRange : prev.voiceRange,
    } : prev);
  };

  const handleVoiceAnalyzed = (voiceRange: VoiceRange) => {
    setUser((prev) => prev ? { ...prev, voiceRange } : prev);
  };

  const handleShareResults = (songs: SongResult[], minFreq: number, maxFreq: number, baseFreq: number) => {
    setPendingShare({ songs, minFreq, maxFreq, baseFreq });
    setScreen("dashboard");
    toast.success("¡Resultados listos para compartir en Social!");
  };

  switch (screen) {
    case "welcome":
      return (
        <WelcomeScreen
          onLogin={()  => setScreen("login")}
          onSignup={() => setScreen("signup")}
        />
      );

    case "login":
      return (
        <LoginScreen
          onLogin={handleLogin}
          onBack={() => setScreen("welcome")}
          onForgotPassword={() => setScreen("forgot-password")}
          onGoToSignup={() => setScreen("signup")}
        />
      );

    case "signup":
      return (
        <SignupScreen
          onSignup={handleSignup}
          onBack={() => setScreen("welcome")}
          onGoToLogin={() => setScreen("login")}
        />
      );

    case "forgot-password":
      return (
        <ForgotPasswordScreen
          onBack={() => setScreen("login")}
        />
      );

    case "reset-password":
      return resetToken ? (
        <ResetPasswordScreen
          token={resetToken}
          onSuccess={() => setScreen("login")}
        />
      ) : (
        <WelcomeScreen
          onLogin={() => setScreen("login")}
          onSignup={() => setScreen("signup")}
        />
      );

    case "analyze":
      return (
        <VoiceAnalysisScreen
          onBack={() => setScreen("dashboard")}
          onGoToDashboard={() => setScreen("dashboard")}
          onShareResults={user ? handleShareResults : undefined}
          onVoiceAnalyzed={user ? handleVoiceAnalyzed : undefined}
          userSex={user?.sex}
        />
      );

    case "dashboard":
      return user ? (
        <Dashboard
          userId={user.id}
          username={user.username}
          sex={user.sex}
          photo={user.photo}
          bio={user.bio}
          voiceRange={user.voiceRange}
          onLogout={handleLogout}
          onAnalyze={() => setScreen("analyze")}
          onProfileUpdate={handleProfileUpdate}
          pendingShareData={pendingShare}
          onClearShare={() => setPendingShare(null)}
        />
      ) : (
        <WelcomeScreen
          onLogin={() => setScreen("login")}
          onSignup={() => setScreen("signup")}
        />
      );

    default:
      return null;
  }
};

export default Index;
