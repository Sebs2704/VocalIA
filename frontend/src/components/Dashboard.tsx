import { useState, useEffect } from "react";
import logoImg from "@/assets/logo.png";
import { Music, Mic, BookOpen, LogOut, ChevronRight, Headphones, TrendingUp, Sparkles, Volume2, Heart, Star, ArrowUp, ArrowDown } from "lucide-react";

interface DashboardProps {
  username: string;
  sex: string;
  onLogout: () => void;
}

const inspirationalQuotes = [
  { text: "La música es el lenguaje universal de la humanidad.", author: "Henry Wadsworth Longfellow" },
  { text: "Donde las palabras fallan, la música habla.", author: "Hans Christian Andersen" },
  { text: "La música expresa lo que no puede decirse y sobre lo que es imposible callar.", author: "Victor Hugo" },
  { text: "Sin música, la vida sería un error.", author: "Friedrich Nietzsche" },
  { text: "La voz es el instrumento más perfecto de todos.", author: "Arvo Pärt" },
];

const maleRanges = [
  {
    name: "Bajo",
    range: "E2 – E4",
    description: "La voz masculina más grave. Profunda y resonante, ideal para ópera, coros y música clásica.",
    color: "from-primary/80 to-primary",
    icon: Volume2,
    songs: [
      { title: "Bésame Mucho - Andrea Bocelli", url: "https://www.youtube.com/watch?v=KQvxDzFOubk" },
      { title: "El Triste - José José", url: "https://www.youtube.com/watch?v=GJvDBGqf9AI" },
    ],
    tips: [
      "Practica ejercicios de respiración diafragmática para controlar el flujo de aire.",
      "Calienta tu voz con escalas descendentes empezando en tu rango cómodo.",
      "Trabaja la resonancia pectoral — coloca la mano en el pecho y siente la vibración.",
      "Evita forzar las notas graves; la relajación de la garganta es clave.",
    ],
    agudos: "Para explorar notas más agudas, practica la técnica de voz mixta combinando resonancia de pecho y cabeza gradualmente.",
    graves: "Fortalece tus graves con ejercicios de lip trill descendentes y vocalizaciones con 'U' profunda.",
  },
  {
    name: "Barítono",
    range: "A2 – A4",
    description: "El rango más común en hombres. Versátil y cálido, abarca desde tonos graves hasta medios.",
    color: "from-primary/60 to-primary/90",
    icon: Headphones,
    songs: [
      { title: "Cuando Nadie Me Ve - Alejandro Sanz", url: "https://www.youtube.com/watch?v=CKt9FGrVf1c" },
      { title: "Solamente Tú - Pablo Alborán", url: "https://www.youtube.com/watch?v=SUfRgPm8O5g" },
    ],
    tips: [
      "Aprovecha tu versatilidad practicando canciones en diferentes estilos.",
      "Trabaja las transiciones entre voz de pecho y voz de cabeza (passaggio).",
      "Haz escalas con la sílaba 'MA' para mantener la posición vocal relajada.",
      "Practica con straw phonation (soplar por un sorbete) para equilibrar la presión.",
    ],
    agudos: "Practica sirenas vocales (glissando) subiendo gradualmente medio tono cada semana. La constancia es clave.",
    graves: "Explora tu registro grave con humming matutino antes de hablar — las cuerdas vocales responden mejor al despertar.",
  },
  {
    name: "Tenor",
    range: "C3 – C5",
    description: "La voz masculina más aguda. Brillante y poderosa, protagonista en ópera y música pop.",
    color: "from-accent/60 to-accent",
    icon: Sparkles,
    songs: [
      { title: "Vivir Mi Vida - Marc Anthony", url: "https://www.youtube.com/watch?v=YXnjy5YlDwk" },
      { title: "Cielito Lindo - Pedro Infante", url: "https://www.youtube.com/watch?v=1fkBcoU-GkU" },
    ],
    tips: [
      "Cuida tu voz con hidratación constante — bebe agua tibia, evita bebidas frías antes de cantar.",
      "Practica el apoyo diafragmático para sostener notas agudas sin tensión.",
      "Trabaja la cobertura vocal (copertura) para proteger tu voz en notas altas.",
      "Realiza ejercicios de agilidad con escalas rápidas y trinos.",
    ],
    agudos: "Practica falsete controlado y ve integrándolo con la voz de pecho. La técnica belting requiere un coach vocal.",
    graves: "Relaja la laringe con bostezos suaves y practica escalas descendentes con la vocal 'O' abierta.",
  },
];

const femaleRanges = [
  {
    name: "Contralto",
    range: "F3 – F5",
    description: "La voz femenina más grave. Rica, oscura y poco común. Tiene una calidez única.",
    color: "from-primary/80 to-primary",
    icon: Volume2,
    songs: [
      { title: "La Llorona - Chavela Vargas", url: "https://www.youtube.com/watch?v=mKyj0YM1jEQ" },
      { title: "Paloma Negra - Lila Downs", url: "https://www.youtube.com/watch?v=3mMhKHJvxCA" },
    ],
    tips: [
      "Explora la resonancia oscura natural de tu voz — no intentes sonar más aguda de lo necesario.",
      "Practica legato (notas conectadas) para aprovechar la calidez de tu timbre.",
      "Trabaja escalas cromáticas descendentes para fortalecer tu registro grave.",
      "La postura es esencial: mantén los hombros relajados y el pecho abierto.",
    ],
    agudos: "Trabaja la voz de cabeza con ejercicios suaves en 'I' y 'E', subiendo medio tono progresivamente.",
    graves: "Potencia tus graves con resonancia de pecho y ejercicios de vocal fry controlado.",
  },
  {
    name: "Mezzosoprano",
    range: "A3 – A5",
    description: "El rango medio femenino. Cálida y expresiva, muy versátil en múltiples géneros musicales.",
    color: "from-accent/50 to-accent/80",
    icon: Headphones,
    songs: [
      { title: "Oye - Gloria Estefan", url: "https://www.youtube.com/watch?v=JA4R0iM1aXo" },
      { title: "Si Tú No Vuelves - Shakira", url: "https://www.youtube.com/watch?v=KJOqk3xjGhA" },
    ],
    tips: [
      "Tu versatilidad es tu mayor fortaleza — practica diferentes estilos musicales.",
      "Trabaja la uniformidad de color en toda tu extensión con vocalizaciones en 'AH'.",
      "Practica messa di voce (crescendo y diminuendo en una sola nota) para control dinámico.",
      "Fortalece el apoyo abdominal con ejercicios de respiración costal.",
    ],
    agudos: "Practica con ejercicios de 'NG' nasal ascendente para encontrar la resonancia alta sin tensión.",
    graves: "Relaja la mandíbula y practica con vocalizaciones graves por la mañana para expandir tu rango.",
  },
  {
    name: "Soprano",
    range: "C4 – C6",
    description: "La voz femenina más aguda. Brillante, ligera y etérea. Estrella de la ópera y el pop.",
    color: "from-accent/70 to-accent",
    icon: Sparkles,
    songs: [
      { title: "Amor Eterno - Rocío Dúrcal", url: "https://www.youtube.com/watch?v=RVOmg_eGwHo" },
      { title: "A Que No Me Dejas - Alejandra Guzmán", url: "https://www.youtube.com/watch?v=IgiRVYpfxTQ" },
    ],
    tips: [
      "Protege tu voz evitando gritar o susurrar en exceso — ambos dañan las cuerdas vocales.",
      "Practica coloratura (ornamentaciones) con escalas rápidas y ligeras.",
      "Trabaja el vibrato natural sin forzarlo — debe surgir de un buen apoyo.",
      "Mantén la posición de la laringe estable con ejercicios de 'bostezo-suspiro'.",
    ],
    agudos: "Practica pianissimo en notas agudas para desarrollar control sin presión. La suavidad fortalece.",
    graves: "Explora tu registro de pecho con ejercicios en 'MO' descendente — no temas sonar diferente abajo.",
  },
];

type Tab = "inicio" | "conoce" | "material";

const Dashboard = ({ username, sex, onLogout }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("inicio");
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const ranges = sex === "masculino" ? maleRanges : femaleRanges;
  const currentRange = ranges.find((r) => r.name === selectedRange);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % inspirationalQuotes.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const quote = inspirationalQuotes[quoteIndex];

  const handleSimulateRecording = () => {
    setIsRecording(true);
    setTimeout(() => setIsRecording(false), 5000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="VocalIA" className="w-10 h-10 object-contain" />
            <span className="font-heading font-bold text-lg text-foreground">VocalIA</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-body text-muted-foreground hidden sm:block">
              Hola, <span className="text-foreground font-medium">{username}</span>
            </span>
            <button onClick={onLogout} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-body transition-colors">
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="bg-card/50 border-b border-border">
        <div className="container mx-auto flex px-4">
          {[
            { key: "inicio" as Tab, label: "Inicio", icon: Music },
            { key: "conoce" as Tab, label: "Conoce tu Rango", icon: Mic },
            { key: "material" as Tab, label: "Material", icon: BookOpen },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-body font-medium border-b-2 transition-all ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* ======= INICIO ======= */}
        {activeTab === "inicio" && (
          <div className="animate-fade-in space-y-8">
            {/* Frase inspiradora */}
            <div className="relative bg-card/80 rounded-3xl p-8 md:p-12 border border-border shadow-vocalia overflow-hidden text-center">
              <div className="absolute top-4 right-4 opacity-10">
                <Music className="w-24 h-24 text-primary" />
              </div>
              <div className="absolute bottom-4 left-4 opacity-10">
                <Headphones className="w-20 h-20 text-accent" />
              </div>
              <Heart className="w-8 h-8 text-accent mx-auto mb-4 animate-pulse-glow" />
              <blockquote className="text-xl md:text-2xl font-heading font-bold text-card-foreground mb-3 transition-all duration-500">
                "{quote.text}"
              </blockquote>
              <p className="text-sm font-body text-muted-foreground italic">— {quote.author}</p>
            </div>

            {/* Cards informativas */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="group bg-card/80 rounded-2xl p-6 border border-border shadow-vocalia hover:scale-[1.03] hover:shadow-lg transition-all duration-300 cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                  <Mic className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-heading font-bold text-card-foreground mb-2">Tu Voz es Única</h3>
                <p className="text-sm font-body text-muted-foreground">
                  Cada persona tiene un rango vocal único determinado por la anatomía de sus cuerdas vocales. Descubre el tuyo con VocalIA.
                </p>
              </div>

              <div className="group bg-card/80 rounded-2xl p-6 border border-border shadow-vocalia hover:scale-[1.03] hover:shadow-lg transition-all duration-300 cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mb-4 group-hover:bg-accent/25 transition-colors">
                  <TrendingUp className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-heading font-bold text-card-foreground mb-2">Mejora Constante</h3>
                <p className="text-sm font-body text-muted-foreground">
                  Con práctica y las técnicas adecuadas puedes expandir tu rango vocal hasta 5 semitonos adicionales.
                </p>
              </div>

              <div className="group bg-card/80 rounded-2xl p-6 border border-border shadow-vocalia hover:scale-[1.03] hover:shadow-lg transition-all duration-300 cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-heading font-bold text-card-foreground mb-2">IA Musical</h3>
                <p className="text-sm font-body text-muted-foreground">
                  Nuestra inteligencia artificial está entrenándose para clasificar tu voz con precisión profesional.
                </p>
              </div>
            </div>

            {/* Rangos vocales interactivos */}
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
                Rangos Vocales {sex === "masculino" ? "Masculinos" : "Femeninos"}
              </h2>
              <p className="text-muted-foreground font-body mb-6 text-sm">
                Explora los diferentes rangos y descubre las características de cada uno.
              </p>
              <div className="grid md:grid-cols-3 gap-5">
                {ranges.map((range) => {
                  const Icon = range.icon;
                  return (
                    <button
                      key={range.name}
                      onClick={() => setSelectedRange(selectedRange === range.name ? null : range.name)}
                      className={`text-left p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] group ${
                        selectedRange === range.name
                          ? "border-primary bg-card shadow-vocalia"
                          : "border-border bg-card/60 hover:border-primary/50"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${range.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-card-foreground mb-1">{range.name}</h3>
                      <p className="text-xs font-body text-muted-foreground mb-2">Rango: {range.range}</p>
                      <p className="text-sm font-body text-card-foreground/80">{range.description}</p>
                      <div className="flex items-center gap-1 mt-3 text-primary text-xs font-body font-medium">
                        {selectedRange === range.name ? "Ocultar detalles" : "Ver más"} <ChevronRight className={`w-3 h-3 transition-transform ${selectedRange === range.name ? "rotate-90" : ""}`} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {currentRange && (
                <div className="mt-6 bg-card/80 rounded-2xl p-6 border border-border shadow-vocalia animate-slide-up">
                  <h3 className="text-xl font-heading font-bold text-card-foreground mb-4">
                    Sobre el rango {currentRange.name}
                  </h3>
                  <p className="text-sm font-body text-muted-foreground mb-4">{currentRange.description}</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUp className="w-4 h-4 text-accent" />
                        <span className="text-sm font-body font-semibold text-card-foreground">Mejorar agudos</span>
                      </div>
                      <p className="text-xs font-body text-muted-foreground">{currentRange.agudos}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDown className="w-4 h-4 text-primary" />
                        <span className="text-sm font-body font-semibold text-card-foreground">Mejorar graves</span>
                      </div>
                      <p className="text-xs font-body text-muted-foreground">{currentRange.graves}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======= CONOCE TU RANGO ======= */}
        {activeTab === "conoce" && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="bg-card/80 rounded-3xl p-8 md:p-10 border border-border shadow-vocalia text-center">
              <Mic className={`w-16 h-16 mx-auto mb-4 ${isRecording ? "text-accent animate-pulse" : "text-primary animate-pulse-glow"}`} />
              <h2 className="text-3xl font-heading font-bold text-card-foreground mb-3">
                Conoce tu Rango Vocal
              </h2>
              <p className="text-muted-foreground font-body mb-4 text-sm">
                En esta sección, nuestra inteligencia artificial analizará tu voz en tiempo real para determinar tu rango vocal.
              </p>

              <div className="bg-secondary/50 rounded-xl p-5 mb-6 text-left space-y-3">
                <h4 className="font-heading font-bold text-card-foreground text-sm">¿Cómo funciona?</h4>
                <ol className="text-xs font-body text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Presiona el botón de grabar y canta notas desde la más grave hasta la más aguda que puedas.</li>
                  <li>La IA analiza las frecuencias de tu voz y las compara con los rangos vocales estándar.</li>
                  <li>En segundos recibirás tu clasificación: {sex === "masculino" ? "Bajo, Barítono o Tenor" : "Contralto, Mezzosoprano o Soprano"}.</li>
                  <li>Con tu rango identificado, te recomendaremos material personalizado para practicar.</li>
                </ol>
              </div>

              {/* Botón de grabación */}
              <div className="relative mb-6">
                <div className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center transition-all duration-500 ${
                  isRecording ? "bg-accent/20 shadow-[0_0_50px_hsl(15_70%_50%/0.3)]" : "bg-primary/10"
                }`}>
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping" />
                  )}
                  <button
                    onClick={handleSimulateRecording}
                    disabled={isRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-vocalia-button ${
                      isRecording ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground hover:scale-110"
                    }`}
                  >
                    <Mic className="w-8 h-8" />
                  </button>
                </div>
                {isRecording && (
                  <div className="flex items-end justify-center gap-1 mt-4 h-6">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-accent/60 rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 100}%`,
                          animationDelay: `${i * 0.06}s`,
                          animationDuration: `${0.3 + Math.random() * 0.4}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <p className="text-xs font-body text-muted-foreground mt-3">
                  {isRecording ? "🔴 Analizando tu voz..." : "Presiona para comenzar la prueba"}
                </p>
              </div>

              {/* Placeholder: selección manual para desarrollo */}
              <div className="border-t border-border pt-6">
                <p className="text-xs font-body text-muted-foreground mb-3 font-medium">
                  🛠️ Modo desarrollo — selecciona un rango para probar:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {ranges.map((range) => (
                    <button
                      key={range.name}
                      onClick={() => {
                        setSelectedRange(range.name);
                        setActiveTab("material");
                      }}
                      className="px-4 py-2 rounded-xl border border-border hover:border-primary text-foreground font-body text-xs font-medium hover:bg-primary/10 transition-all"
                    >
                      {range.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======= MATERIAL ======= */}
        {activeTab === "material" && (
          <div className="animate-fade-in">
            {selectedRange && currentRange ? (
              <>
                <h2 className="text-3xl font-heading font-bold text-foreground mb-2">
                  Material para {currentRange.name}
                </h2>
                <p className="text-muted-foreground font-body mb-8 text-sm">
                  Canciones y estrategias para el rango {currentRange.name} ({currentRange.range}).
                </p>

                {/* Consejos y estrategias */}
                <div className="bg-card/80 rounded-2xl p-6 border border-border shadow-vocalia mb-8">
                  <h3 className="font-heading font-bold text-card-foreground mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-accent" /> Estrategias y Consejos
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3 mb-5">
                    {currentRange.tips.map((tip, i) => (
                      <div key={i} className="flex gap-3 bg-secondary/40 rounded-xl p-4 border border-border">
                        <span className="text-primary font-heading font-bold text-lg">{i + 1}</span>
                        <p className="text-xs font-body text-muted-foreground">{tip}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUp className="w-4 h-4 text-accent" />
                        <span className="text-sm font-body font-semibold text-card-foreground">Expandir agudos</span>
                      </div>
                      <p className="text-xs font-body text-muted-foreground">{currentRange.agudos}</p>
                    </div>
                    <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDown className="w-4 h-4 text-primary" />
                        <span className="text-sm font-body font-semibold text-card-foreground">Fortalecer graves</span>
                      </div>
                      <p className="text-xs font-body text-muted-foreground">{currentRange.graves}</p>
                    </div>
                  </div>
                </div>

                {/* Canciones */}
                <h3 className="text-xl font-heading font-bold text-foreground mb-4 flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" /> Canciones Recomendadas
                </h3>
                <div className="grid gap-6">
                  {currentRange.songs.map((song, i) => (
                    <div key={i} className="bg-card/80 rounded-2xl p-6 border border-border shadow-vocalia">
                      <h4 className="font-heading font-bold text-card-foreground mb-3">{song.title}</h4>
                      <div className="aspect-video rounded-xl overflow-hidden bg-foreground/5">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${new URL(song.url).searchParams.get("v")}`}
                          title={song.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="border-0"
                        />
                      </div>
                      <div className="mt-4 bg-secondary/50 rounded-xl p-4">
                        <p className="text-xs font-body text-muted-foreground">
                          🎤 Próximamente: Grabación en vivo con evaluación por IA — la canción se evaluará
                          en segmentos de 10 segundos comparando tu nota con la original.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Material Musical</h2>
                <p className="text-muted-foreground font-body text-sm">
                  Primero descubre tu rango vocal en "Conoce tu Rango" para ver material personalizado.
                </p>
                <button
                  onClick={() => setActiveTab("conoce")}
                  className="mt-4 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-105 transition-all"
                >
                  Descubrir mi rango
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
