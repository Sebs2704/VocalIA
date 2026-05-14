import { useState } from "react";
import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import { ArrowLeft, Mail, CheckCircle, Loader2 } from "lucide-react";
import { apiForgotPassword } from "@/lib/api";
import { toast } from "sonner";

interface ForgotPasswordScreenProps {
  onBack: () => void;
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

const ForgotPasswordScreen = ({ onBack }: ForgotPasswordScreenProps) => {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiForgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al enviar el correo");
    } finally {
      setLoading(false);
    }
  };

  const btnShadow = `0 3px 0 ${T.btnBot}, 0 6px 20px ${T.shadow}0.35), inset 0 1px 0 rgba(255,255,255,0.16)`;

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${backgroundImg})` }} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${T.dark}cc 0%, ${T.mid}99 100%)` }} />

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
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
            <h2 className="text-xl font-heading font-bold text-white text-center" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
              {sent ? "¡Correo enviado!" : "¿Olvidaste tu contraseña?"}
            </h2>
          </div>

          {/* Body */}
          <div className="px-8 py-7">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.45)", boxShadow: "0 4px 16px rgba(0,60,100,0.14), inset 0 1px 0 rgba(255,255,255,0.72)" }}
                  >
                    <CheckCircle className="w-9 h-9" style={{ color: T.mid }} />
                  </div>
                </div>
                <p className="font-body text-sm leading-relaxed" style={{ color: T.textMd }}>
                  Si <span className="font-semibold" style={{ color: T.text }}>{email}</span> está registrado
                  en VocalIA, recibirás un enlace para restablecer tu contraseña.<br /><br />
                  Revisa también tu carpeta de <strong>spam</strong>.
                </p>
                <p className="text-xs font-body" style={{ color: "rgba(15,48,64,0.45)" }}>El enlace expira en 1 hora.</p>
                <button
                  onClick={onBack}
                  className="w-full py-3.5 rounded-xl font-heading font-semibold text-sm text-white transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${T.dark} 0%, ${T.mid} 100%)`,
                    boxShadow: btnShadow,
                  }}
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-body text-center mb-6 leading-relaxed" style={{ color: T.textMd }}>
                  Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-body font-medium mb-1.5" style={{ color: T.textMd }}>
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" style={{ color: T.text }} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-body focus:outline-none"
                        style={{
                          background: "rgba(255,255,255,0.45)",
                          border: "1px solid rgba(255,255,255,0.65)",
                          boxShadow: "inset 0 2px 4px rgba(0,60,100,0.07)",
                          color: T.text,
                        }}
                        placeholder="tu@correo.com"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-semibold text-sm text-white transition-all disabled:opacity-60"
                    style={{
                      background: `linear-gradient(135deg, ${T.dark} 0%, ${T.mid} 100%)`,
                      boxShadow: btnShadow,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${T.btnBot}, 0 10px 28px ${T.shadow}0.40), inset 0 1px 0 rgba(255,255,255,0.16)`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = btnShadow;
                    }}
                    onMouseDown={(e) => {
                      if (!loading) {
                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(2px)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 1px 0 ${T.btnBot}, 0 2px 8px ${T.shadow}0.28), inset 0 1px 0 rgba(255,255,255,0.16)`;
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!loading) {
                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${T.btnBot}, 0 10px 28px ${T.shadow}0.40), inset 0 1px 0 rgba(255,255,255,0.16)`;
                      }
                    }}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                    ) : (
                      <>Enviar enlace de restablecimiento</>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
