import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import { Music, Mic, Star, BarChart2 } from "lucide-react";

interface WelcomeScreenProps {
  onLogin:  () => void;
  onSignup: () => void;
}

const FloatingNote = ({ className, delay }: { className?: string; delay: string }) => (
  <div className={`absolute opacity-20 animate-float ${className}`} style={{ animationDelay: delay }}>
    <Music className="w-6 h-6 text-primary" />
  </div>
);

const WelcomeScreen = ({ onLogin, onSignup }: WelcomeScreenProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background/70" />

      {/* Floating musical notes */}
      <FloatingNote className="top-[8%]  left-[6%]"      delay="0s"   />
      <FloatingNote className="top-[18%] right-[8%]"     delay="0.7s" />
      <FloatingNote className="top-[55%] left-[12%]"     delay="1.3s" />
      <FloatingNote className="top-[38%] right-[18%]"    delay="1.9s" />
      <FloatingNote className="bottom-[18%] left-[28%]"  delay="2.5s" />

      {/* Top bar */}
      <div className="relative z-10 flex justify-end px-6 pt-5">
        <button
          type="button"
          onClick={onLogin}
          className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          ¿Ya tienes cuenta?{" "}
          <span className="text-primary font-medium underline underline-offset-2">Inicia sesión</span>
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-6 py-8">
        <div className="animate-slide-up flex flex-col items-center text-center max-w-xl w-full">

          {/* Logo */}
          <div className="mb-5 animate-pulse-glow">
            <img src={logoImg} alt="VocalIA Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-lg" />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-3 tracking-tight">
            Vocal<span className="text-primary">IA</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground font-body mb-2">
            Descubre qué canciones se adaptan a tu voz con IA
          </p>
          <p className="text-sm text-muted-foreground/70 font-body mb-10 max-w-sm">
            Canta tres frases, nuestra IA analiza tu voz y te dice qué canciones te quedan perfectas.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { icon: Mic,       label: "Graba tu voz" },
              { icon: BarChart2, label: "Análisis con IA" },
              { icon: Star,      label: "Canciones compatibles" },
            ].map(({ icon: Icon, label }) => (
              <div key={label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border/50 backdrop-blur-sm text-sm font-body text-muted-foreground">
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </div>
            ))}
          </div>

          {/* CTAs — solo cuenta */}
          <button
            type="button"
            onClick={onSignup}
            className="w-full max-w-xs py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-lg shadow-vocalia-button hover:scale-105 hover:shadow-lg transition-all duration-300 animate-pulse-glow mb-3"
          >
            Crear cuenta gratis
          </button>

          <button
            type="button"
            onClick={onLogin}
            className="w-full max-w-xs py-3 rounded-xl border border-primary/50 text-primary font-body font-medium text-sm hover:bg-primary/10 transition-all duration-200"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
