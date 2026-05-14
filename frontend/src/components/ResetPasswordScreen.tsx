import { useState } from "react";
import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import { Eye, EyeOff, Lock, CheckCircle, Loader2 } from "lucide-react";
import { apiResetPassword } from "@/lib/api";
import { toast } from "sonner";

interface ResetPasswordScreenProps {
  token:     string;
  onSuccess: () => void;
}

const ResetPasswordScreen = ({ token, onSuccess }: ResetPasswordScreenProps) => {
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await apiResetPassword(token, password);
      setDone(true);
      // Limpiar el token de la URL para que al recargar no vuelva a esta pantalla
      window.history.replaceState({}, "", window.location.pathname);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${backgroundImg})` }} />
      <div className="absolute inset-0 bg-background/20" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="bg-card/90 backdrop-blur-md rounded-2xl p-8 shadow-vocalia border border-border">

          <div className="flex justify-center mb-4">
            <img src={logoImg} alt="VocalIA" className="w-16 h-16 object-contain" />
          </div>

          {done ? (
            /* ── Éxito ── */
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                  <CheckCircle className="w-9 h-9 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-heading font-bold text-card-foreground">
                ¡Contraseña actualizada!
              </h2>
              <p className="text-muted-foreground font-body text-sm leading-relaxed">
                Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <button
                onClick={onSuccess}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Iniciar sesión
              </button>
            </div>
          ) : (
            /* ── Formulario ── */
            <>
              <h2 className="text-2xl font-heading font-bold text-card-foreground text-center mb-2">
                Nueva contraseña
              </h2>
              <p className="text-sm text-muted-foreground font-body text-center mb-6">
                Crea una nueva contraseña segura para tu cuenta.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-body font-medium text-card-foreground mb-1">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-lg bg-input/50 border border-border text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-body font-medium text-card-foreground mb-1">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg bg-input/50 border text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground ${
                        confirm && confirm !== password ? "border-red-400 focus:ring-red-400" : "border-border"
                      }`}
                      placeholder="Repite la contraseña"
                      required
                    />
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-400 font-body mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (!!confirm && confirm !== password)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-[1.02] transition-all disabled:opacity-60 disabled:scale-100"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Actualizando...</>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
