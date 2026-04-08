import { useState } from "react";
import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void;
  onBack: () => void;
  onForgotPassword: () => void;
  onGoToSignup: () => void;
}

const LoginScreen = ({ onLogin, onBack, onForgotPassword, onGoToSignup }: LoginScreenProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${backgroundImg})` }} />
      <div className="absolute inset-0 bg-background/20" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="bg-card/90 backdrop-blur-md rounded-2xl p-8 shadow-vocalia border border-border">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 font-body transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>

          <div className="flex justify-center mb-4">
            <img src={logoImg} alt="VocalIA" className="w-16 h-16 object-contain" />
          </div>

          <h2 className="text-2xl font-heading font-bold text-card-foreground text-center mb-6">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-body font-medium text-card-foreground mb-1">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-input/50 border border-border text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="tu@correo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-card-foreground mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-input/50 border border-border text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground pr-10"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-primary hover:underline font-body"
            >
              ¿Olvidaste tu contraseña?
            </button>

            <button
              type="submit"
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-[1.02] transition-all"
            >
              Ingresar
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground font-body mt-4">
            ¿No tienes cuenta?{" "}
            <button onClick={onGoToSignup} className="text-primary hover:underline font-medium">
              Crear cuenta
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
