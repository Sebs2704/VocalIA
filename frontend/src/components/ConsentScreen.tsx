import { useState } from "react";
import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import { Checkbox } from "@/components/ui/checkbox";

interface ConsentScreenProps {
  onAccept: () => void;
  onBack: () => void;
}

const ConsentScreen = ({ onAccept, onBack }: ConsentScreenProps) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }}
      />
      <div className="absolute inset-0 bg-background/20" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-slide-up">
        <div className="bg-card/90 backdrop-blur-md rounded-2xl p-8 md:p-10 shadow-vocalia border border-border">
          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-card-foreground text-center mb-4">
            Bienvenid@ a <span className="text-primary">VocalIA</span>
          </h2>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoImg} alt="VocalIA Logo" className="w-20 h-20 object-contain" />
          </div>

          {/* Description */}
          <p className="text-card-foreground font-body text-sm md:text-base leading-relaxed text-justify mb-6">
            Este modelo de inteligencia artificial ha sido desarrollado con fines educativos y tiene como
            objetivo clasificar los rangos vocales de los usuarios, considerando su sexo biológico
            (masculino o femenino) como variable de referencia.
          </p>

          <p className="text-card-foreground/80 font-body text-xs md:text-sm leading-relaxed mb-6">
            Al continuar, usted acepta que su voz será grabada y analizada con el fin de determinar su
            rango vocal. Los datos recolectados serán utilizados exclusivamente para mejorar el modelo
            de IA de VocalIA. Se le asignará un identificador aleatorio para proteger su privacidad.
          </p>

          {/* Checkbox */}
          <div className="flex items-center gap-3 mb-6">
            <Checkbox
              id="consent"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="border-primary data-[state=checked]:bg-primary"
            />
            <label
              htmlFor="consent"
              className="text-sm font-body text-card-foreground cursor-pointer"
            >
              Acepto hacer parte del modelo
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-primary text-primary font-heading font-semibold text-sm hover:bg-primary/10 transition-all"
            >
              Volver
            </button>
            <button
              onClick={onAccept}
              disabled={!accepted}
              className="flex-1 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentScreen;
