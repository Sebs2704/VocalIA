import { useState } from "react";
import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

interface SignupScreenProps {
  onSignup: (data: { email: string; username: string; password: string; sex: string }) => void;
  onBack: () => void;
  onGoToLogin: () => void;
}

const SignupScreen = ({ onSignup, onBack, onGoToLogin }: SignupScreenProps) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sex, setSex] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (!sex) {
      setError("Selecciona tu sexo biológico");
      return;
    }
    onSignup({ email, username, password, sex });
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${backgroundImg})` }} />
      <div className="absolute inset-0 bg-background/20" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up py-8">
        <div className="bg-card/90 backdrop-blur-md rounded-2xl p-8 shadow-vocalia border border-border">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 font-body transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>

          <div className="flex justify-center mb-3">
            <img src={logoImg} alt="VocalIA" className="w-14 h-14 object-contain" />
          </div>

          <h2 className="text-2xl font-heading font-bold text-card-foreground text-center mb-5">
            Crear Cuenta
          </h2>

          {error && (
            <div className="bg-destructive/20 text-destructive text-sm font-body p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-body font-medium text-card-foreground mb-1">Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-input/50 border border-border text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="tu@correo.com" required />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-card-foreground mb-1">Nombre de usuario</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-input/50 border border-border text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="Tu nombre de usuario" required />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-card-foreground mb-1">Contraseña</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-input/50 border border-border text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground pr-10"
                  placeholder="••••••••" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-card-foreground mb-1">Confirmar contraseña</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-input/50 border border-border text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="••••••••" required minLength={6} />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-card-foreground mb-1">Sexo biológico</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSex("masculino")}
                  className={`flex-1 py-2.5 rounded-lg border-2 font-body text-sm font-medium transition-all ${sex === "masculino" ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                  Masculino
                </button>
                <button type="button" onClick={() => setSex("femenino")}
                  className={`flex-1 py-2.5 rounded-lg border-2 font-body text-sm font-medium transition-all ${sex === "femenino" ? "border-accent bg-accent/20 text-accent" : "border-border text-muted-foreground hover:border-accent/50"}`}>
                  Femenino
                </button>
              </div>
            </div>

            <button type="submit"
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-[1.02] transition-all mt-2">
              Registrarse
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground font-body mt-4">
            ¿Ya tienes cuenta?{" "}
            <button onClick={onGoToLogin} className="text-primary hover:underline font-medium">Iniciar sesión</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupScreen;
