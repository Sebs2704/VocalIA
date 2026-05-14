import { useState } from "react";
import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

interface SignupScreenProps {
  onSignup: (data: { email: string; username: string; password: string; sex: string }) => void;
  onBack: () => void;
  onGoToLogin: () => void;
}

const T = {
  dark:   "hsl(200,55%,22%)",
  mid:    "hsl(200,50%,34%)",
  light:  "hsl(200,47%,44%)",
  card:   "hsl(200,40%,72%)",
  cardLt: "hsl(200,38%,82%)",
  text:   "hsl(200,55%,17%)",
  textMd: "rgba(15,48,64,0.65)",
  shadow: "rgba(0,60,100,",
  btnBot: "hsl(200,55%,15%)",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.45)",
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "inset 0 2px 4px rgba(0,60,100,0.07)",
  color: T.text,
  width: "100%",
  padding: "10px 16px",
  borderRadius: "12px",
  fontSize: "14px",
  fontFamily: "var(--font-body)",
  outline: "none",
};

const SignupScreen = ({ onSignup, onBack, onGoToLogin }: SignupScreenProps) => {
  const [email,           setEmail]           = useState("");
  const [username,        setUsername]        = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sex,             setSex]             = useState("");
  const [showPassword,    setShowPassword]    = useState(false);
  const [error,           setError]           = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    if (!sex) { setError("Selecciona tu sexo biológico"); return; }
    onSignup({ email, username, password, sex });
  };

  const btnShadow = `0 3px 0 ${T.btnBot}, 0 6px 20px ${T.shadow}0.35), inset 0 1px 0 rgba(255,255,255,0.16)`;

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${backgroundImg})` }} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${T.dark}cc 0%, ${T.mid}99 100%)` }} />

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up py-8">
        <div
          className="overflow-hidden"
          style={{
            borderRadius: "24px",
            background: `linear-gradient(160deg, ${T.cardLt} 0%, ${T.card} 100%)`,
            boxShadow: `0 8px 32px ${T.shadow}0.25), 0 32px 80px ${T.shadow}0.20), inset 0 1px 0 rgba(255,255,255,0.55)`,
            border: "1px solid rgba(255,255,255,0.45)",
          }}
        >
          {/* Header teal */}
          <div
            className="relative flex flex-col items-center pt-8 pb-6 px-8"
            style={{
              background: `linear-gradient(145deg, ${T.dark} 0%, ${T.mid} 55%, ${T.light} 100%)`,
              boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.10)",
            }}
          >
            <button
              onClick={onBack}
              className="absolute top-4 left-4 flex items-center gap-1 text-xs font-body transition-all"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <div
              className="mb-3"
              style={{
                padding: "10px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.18)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.30)",
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              <img src={logoImg} alt="VocalIA" className="w-12 h-12 object-contain" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
              Crear Cuenta
            </h2>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-3">
            {error && (
              <div
                className="text-sm font-body p-3 rounded-xl text-center"
                style={{ background: "rgba(254,205,211,0.55)", border: "1px solid rgba(254,205,211,0.80)", color: "#be123c" }}
              >
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-body font-medium mb-1" style={{ color: T.textMd }}>Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="tu@correo.com" required />
            </div>

            <div>
              <label className="block text-xs font-body font-medium mb-1" style={{ color: T.textMd }}>Nombre de usuario</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} placeholder="Tu nombre de usuario" required />
            </div>

            <div>
              <label className="block text-xs font-body font-medium mb-1" style={{ color: T.textMd }}>Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: "40px" }}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: T.text }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-body font-medium mb-1" style={{ color: T.textMd }}>Confirmar contraseña</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="••••••••" required minLength={6} />
            </div>

            <div>
              <label className="block text-xs font-body font-medium mb-2" style={{ color: T.textMd }}>Sexo biológico</label>
              <div className="flex gap-3">
                {[
                  { val: "masculino", label: "Masculino" },
                  { val: "femenino",  label: "Femenino"  },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSex(val)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all"
                    style={sex === val ? {
                      background: `linear-gradient(135deg, ${T.dark} 0%, ${T.mid} 100%)`,
                      color: "white",
                      border: "1px solid transparent",
                      boxShadow: `0 2px 8px ${T.shadow}0.22), inset 0 1px 0 rgba(255,255,255,0.16)`,
                    } : {
                      background: "rgba(255,255,255,0.35)",
                      color: T.textMd,
                      border: "1px solid rgba(255,255,255,0.55)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              onClick={handleSubmit}
              className="w-full py-3.5 rounded-xl font-heading font-semibold text-sm flex items-center justify-center transition-all mt-1"
              style={{
                background: `linear-gradient(135deg, ${T.dark} 0%, ${T.mid} 100%)`,
                color: "white",
                boxShadow: btnShadow,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${T.btnBot}, 0 10px 28px ${T.shadow}0.40), inset 0 1px 0 rgba(255,255,255,0.16)`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = btnShadow;
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 1px 0 ${T.btnBot}, 0 2px 8px ${T.shadow}0.28), inset 0 1px 0 rgba(255,255,255,0.16)`;
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${T.btnBot}, 0 10px 28px ${T.shadow}0.40), inset 0 1px 0 rgba(255,255,255,0.16)`;
              }}
            >
              Registrarse
            </button>

            <p className="text-center text-sm font-body" style={{ color: T.textMd }}>
              ¿Ya tienes cuenta?{" "}
              <button onClick={onGoToLogin} className="font-semibold hover:underline transition-all" style={{ color: T.mid }}>
                Iniciar sesión
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupScreen;
