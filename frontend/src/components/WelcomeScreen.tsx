import { useState } from "react";
import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import { Music, Mic, Star, Heart } from "lucide-react";

interface WelcomeScreenProps {
  onContinue: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

const FloatingNote = ({ className, delay }: { className?: string; delay: string }) => (
  <div
    className={`absolute opacity-30 animate-float ${className}`}
    style={{ animationDelay: delay }}
  >
    <Music className="w-6 h-6 text-primary" />
  </div>
);

const WelcomeScreen = ({ onContinue, onLogin, onSignup }: WelcomeScreenProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/50" />

      {/* Floating musical notes */}
      <FloatingNote className="top-[10%] left-[5%]" delay="0s" />
      <FloatingNote className="top-[20%] right-[10%]" delay="0.5s" />
      <FloatingNote className="top-[60%] left-[15%]" delay="1s" />
      <FloatingNote className="top-[40%] right-[20%]" delay="1.5s" />
      <FloatingNote className="bottom-[20%] left-[30%]" delay="2s" />

      {/* Top auth bar */}
      <div className="relative z-10 flex justify-end gap-3 p-4 md:p-6">
        <button
          onClick={onLogin}
          className="px-5 py-2 rounded-lg bg-primary/80 text-primary-foreground font-body font-medium text-sm backdrop-blur-sm hover:bg-primary transition-all shadow-vocalia-button"
        >
          Iniciar Sesión
        </button>
        <button
          onClick={onSignup}
          className="px-5 py-2 rounded-lg border-2 border-primary text-primary font-body font-medium text-sm backdrop-blur-sm hover:bg-primary hover:text-primary-foreground transition-all"
        >
          Crear Cuenta
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="animate-slide-up flex flex-col items-center text-center max-w-2xl">
          {/* Logo */}
          <div className="mb-6 animate-pulse-glow">
            <img src={logoImg} alt="VocalIA Logo" className="w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-lg" />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-foreground mb-4 tracking-tight">
            Bienvenid@ a{" "}
            <span className="text-primary">VocalIA</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground font-body mb-2 max-w-lg">
            Descubre tu rango vocal con inteligencia artificial
          </p>

          {/* Description */}
          <p className="text-sm md:text-base text-muted-foreground/80 font-body mb-10 max-w-md">
            No importa si eres cantante profesional o simplemente amas la música.
            VocalIA analiza tu voz y te ayuda a conocer tu potencial.
          </p>

          {/* Feature icons */}
          <div className="flex gap-8 mb-10">
            <div className="flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-vocalia">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-body">Graba</span>
            </div>
            <div className="flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: "0.6s" }}>
              <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-vocalia">
                <Star className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground font-body">Analiza</span>
            </div>
            <div className="flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: "0.9s" }}>
              <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shadow-vocalia">
                <Heart className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground font-body">Descubre</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={onContinue}
            className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-lg shadow-vocalia-button hover:scale-105 hover:shadow-lg transition-all duration-300 animate-pulse-glow"
          >
            🎤 Comenzar
          </button>
          <p className="text-xs text-muted-foreground/60 font-body mt-3">
            Contribuye con tu voz de forma anónima para entrenar nuestra IA
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
