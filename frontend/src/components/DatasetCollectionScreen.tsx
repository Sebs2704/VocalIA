import { useState, useRef, useEffect } from "react";
import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import {
  Mic, ArrowLeft, Play, Square, RotateCcw,
  ChevronRight, CheckCircle, Volume2, Loader2
} from "lucide-react";
import { apiSubmitSample } from "@/lib/api";
import { toast } from "sonner";

interface DatasetCollectionScreenProps {
  onBack: () => void;
}

// ─── Secuencias de notas ─────────────────────────────────────────────────────
const NOTAS_MUJER = [
  "G3","A3","B3","C4","D4","E4","E4","F4","G4","A4","A4","B4","C5","C5","D5",
];
const NOTAS_HOMBRE = [
  "E2","G2","A2","C3","C3","D3","F3","F3","G3","A3","A3","C4","D4","D4","F4","A4","C5","D5",
];

const FASE_LABELS: Record<string, Record<string, string>> = {
  mujer: {
    G3:"Grave",A3:"Grave",B3:"Grave",
    C4:"Media",D4:"Media",E4:"Media",F4:"Media",G4:"Media",A4:"Media",
    B4:"Aguda",C5:"Aguda",D5:"Aguda",
  },
  hombre: {
    E2:"Grave",G2:"Grave",A2:"Grave",C3:"Grave",
    D3:"Media",F3:"Media",G3:"Media",A3:"Media",C4:"Media",D4:"Media",
    F4:"Aguda",A4:"Aguda",C5:"Aguda",D5:"Aguda",
  },
};

function getFase(nota: string, sexo: string): string {
  return FASE_LABELS[sexo]?.[nota] ?? "Media";
}

/**
 * Ruta del audio de referencia de piano.
 * El backend monta /audio/piano → dataset_audio/voz/
 * Las carpetas en disco son "Hombres" y "Mujeres" (con mayúscula).
 */
function getAudioUrl(nota: string, sexo: string): string {
const carpeta = sexo === "mujer" ? "mujer" : "hombre";
return `/Audio/piano/${carpeta}/${nota}.wav`;
}

/** Genera un ID anónimo de sesión local (se persiste en sessionStorage). */
function getOrCreateSessionId(): string {
  const key = "vocalia_session_id";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = "ANON-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  sessionStorage.setItem(key, id);
  return id;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface PitchAnalysis {
  nota_ref: string;
  ref_hz: number;
  detected_hz: number;
  cents_deviation: number;
  rating: string;
  en_rango_humano: boolean;
}

// ─── Componente principal ─────────────────────────────────────────────────────
const DatasetCollectionScreen = ({ onBack }: DatasetCollectionScreenProps) => {
  const [paso, setPaso] = useState<"sexo" | "instrucciones" | "grabacion" | "fin">("sexo");
  const [sexo, setSexo] = useState<"mujer" | "hombre" | null>(null);
  const [sessionId] = useState<string>(getOrCreateSessionId);
  const [indiceNota, setIndiceNota] = useState(0);
  const [grabando, setGrabando] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [bloqueGrabado, setBloqueGrabado] = useState<Blob | null>(null);
  const [reproduciendoblock, setReproduciendoBlob] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [pitchResult, setPitchResult] = useState<PitchAnalysis | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRefPiano = useRef<HTMLAudioElement | null>(null);
  const audioRefBlob = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notas = sexo === "mujer" ? NOTAS_MUJER : NOTAS_HOMBRE;
  const notaActual = notas[indiceNota];
  const totalNotas = notas.length;
  const progreso = Math.round((indiceNota / totalNotas) * 100);
  const fase = sexo ? getFase(notaActual, sexo) : "";
  const esRepeticion = indiceNota > 0 && notaActual === notas[indiceNota - 1];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      audioRefPiano.current?.pause();
      audioRefBlob.current?.pause();
    };
  }, []);

  // ── Reproducir audio de piano (ilimitado) ──────────────────────────────
  const reproducirPiano = () => {
    if (!sexo || grabando) return;
    // Si ya está sonando, detenerlo (toggle)
    if (reproduciendo) {
      audioRefPiano.current?.pause();
      setReproduciendo(false);
      return;
    }
    const url = getAudioUrl(notaActual, sexo);
    const audio = new Audio(url);
    audioRefPiano.current = audio;
    setReproduciendo(true);
    audio.play();
    audio.onended = () => setReproduciendo(false);
    audio.onerror = () => {
      setReproduciendo(false);
      toast.error("No se pudo cargar el audio de referencia. Verifica que el backend esté corriendo.");
    };
  };

  // ── Grabar (3 segundos auto-stop o manual) ────────────────────────────
  const iniciarGrabacion = async () => {
    // Detener piano si estaba sonando
    audioRefPiano.current?.pause();
    setReproduciendo(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setBloqueGrabado(blob);
        setPitchResult(null); // limpiar análisis anterior
        setGrabando(false);
        setIntentos((i) => i + 1);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setGrabando(true);
      setBloqueGrabado(null);
      setPitchResult(null);

      // Auto-detener a los 3 segundos (tessitura / duración mínima recomendada)
      timerRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 3000);
    } catch {
      toast.error("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  const detenerGrabacion = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // ── Reproducir grabación propia (ilimitado) ───────────────────────────
  const reproducirGrabacion = () => {
    if (!bloqueGrabado) return;
    if (reproduciendoblock) {
      audioRefBlob.current?.pause();
      setReproduciendoBlob(false);
      return;
    }
    const url = URL.createObjectURL(bloqueGrabado);
    const audio = new Audio(url);
    audioRefBlob.current = audio;
    setReproduciendoBlob(true);
    audio.play();
    audio.onended = () => {
      setReproduciendoBlob(false);
      URL.revokeObjectURL(url);
    };
  };

  // ── Confirmar y pasar a la siguiente nota ─────────────────────────────
  const confirmarYSiguiente = async () => {
    if (!bloqueGrabado || !sexo) return;
    setSubiendo(true);
    try {
      const res = await apiSubmitSample(bloqueGrabado, sexo, sessionId, notaActual, intentos);
      // Mostrar resultado de afinación si el backend lo devuelve
      if (res.analysis) {
        setPitchResult(res.analysis);
        // Esperar un momento para que el usuario vea el resultado antes de avanzar
        await new Promise((r) => setTimeout(r, 2200));
      }
      if (indiceNota + 1 >= totalNotas) {
        setPaso("fin");
      } else {
        setIndiceNota((i) => i + 1);
        setBloqueGrabado(null);
        setPitchResult(null);
        setIntentos(0);
      }
    } catch (e: any) {
      toast.error(e.message || "Error al enviar la muestra");
    } finally {
      setSubiendo(false);
    }
  };

  // ── Reintentar grabación ──────────────────────────────────────────────
  const reintentarGrabacion = () => {
    setBloqueGrabado(null);
    setPitchResult(null);
  };

  // ─── Colores de afinación ──────────────────────────────────────────────
  const ratingColor: Record<string, string> = {
    Excelente: "text-green-400",
    Buena:     "text-lime-400",
    Regular:   "text-yellow-400",
    Desafinado:"text-red-400",
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDERS
  // ════════════════════════════════════════════════════════════════════════

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${backgroundImg})` }} />
      <div className="absolute inset-0 bg-background/75 backdrop-blur-sm" />
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-body transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="VocalIA" className="w-8 h-8 object-contain" />
            <span className="font-heading font-bold text-foreground">VocalIA</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  // ── Paso 1: Selección de sexo ──────────────────────────────────────────
  if (paso === "sexo") return (
    <Wrapper>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="animate-slide-up max-w-md w-full">
          <div className="bg-card/90 backdrop-blur-md rounded-3xl p-8 border border-border shadow-vocalia text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-5">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-card-foreground mb-2">Contribuir al Dataset</h2>
            <p className="text-sm font-body text-muted-foreground mb-2">
              Tu grabación es <strong>completamente anónima</strong>. Ayudarás a entrenar la IA de VocalIA.
            </p>
            <p className="text-xs font-body text-muted-foreground/70 mb-6">
              ID de sesión: <span className="font-mono text-primary">{sessionId}</span>
            </p>
            <p className="text-sm font-body font-medium text-card-foreground mb-4">¿Cuál es tu sexo biológico?</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { value: "mujer",  label: "Mujer",  emoji: "🎶", notas: 15 },
                { value: "hombre", label: "Hombre", emoji: "🎵", notas: 18 },
              ].map((opt) => (
                <button key={opt.value} onClick={() => setSexo(opt.value as any)}
                  className={`p-4 rounded-2xl border-2 font-body text-sm font-medium transition-all hover:scale-105 ${
                    sexo === opt.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card/50 text-card-foreground hover:border-primary/50"
                  }`}>
                  <span className="text-2xl block mb-1">{opt.emoji}</span>
                  {opt.label}
                  <span className="block text-xs text-muted-foreground mt-1">{opt.notas} grabaciones</span>
                </button>
              ))}
            </div>
            <button onClick={() => sexo && setPaso("instrucciones")} disabled={!sexo}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100">
              Continuar →
            </button>
          </div>
        </div>
      </div>
    </Wrapper>
  );

  // ── Paso 2: Instrucciones ──────────────────────────────────────────────
  if (paso === "instrucciones") return (
    <Wrapper>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="animate-slide-up max-w-lg w-full">
          <div className="bg-card/90 backdrop-blur-md rounded-3xl p-8 border border-border shadow-vocalia">
            <h2 className="text-2xl font-heading font-bold text-card-foreground mb-2 text-center">¿Cómo funciona?</h2>
            <p className="text-sm font-body text-muted-foreground text-center mb-6">Lee esto antes de comenzar</p>
            <div className="space-y-4 mb-6">
              {[
                { num: "1", title: "Escucha la nota de referencia", desc: "Presiona ▶ para escuchar el audio de piano. Puedes reproducirlo las veces que quieras antes de grabar." },
                { num: "2", title: "Graba imitando la nota", desc: "Presiona el micrófono y canta o tararea la nota. La grabación se detiene automáticamente a los 3 segundos (puedes pararla antes)." },
                { num: "3", title: "Escúchate y revisa el análisis", desc: "Reproduce tu grabación. Al confirmar verás tu afinación comparada con la nota real en cents." },
                { num: "4", title: "Confirma o repite", desc: "Si no te convence, presiona Repetir (sin límite). Cuando estés conforme, pulsa Siguiente y el audio se guarda." },
              ].map((item) => (
                <div key={item.num} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{item.num}</span>
                  </div>
                  <div>
                    <p className="text-sm font-body font-semibold text-card-foreground">{item.title}</p>
                    <p className="text-xs font-body text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-primary/10 rounded-xl p-3 mb-6">
              <p className="text-xs font-body text-primary font-medium text-center">
                🎯 Consejo: No necesitas ser cantante. Solo imita el sonido lo mejor que puedas.
              </p>
            </div>
            <button onClick={() => setPaso("grabacion")}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-105 transition-all">
              ¡Comenzar grabaciones!
            </button>
          </div>
        </div>
      </div>
    </Wrapper>
  );

  // ── Paso 3: Grabación guiada ───────────────────────────────────────────
  if (paso === "grabacion") return (
    <Wrapper>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="animate-slide-up max-w-lg w-full space-y-4">

          {/* Barra de progreso */}
          <div className="bg-card/80 backdrop-blur-md rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-body text-muted-foreground">Progreso</span>
              <span className="text-xs font-body font-medium text-primary">{indiceNota + 1} / {totalNotas}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
            </div>
          </div>

          {/* Nota actual */}
          <div className="bg-card/90 backdrop-blur-md rounded-3xl p-6 border border-border shadow-vocalia">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-body font-semibold px-2 py-1 rounded-full ${
                  fase === "Grave"  ? "bg-blue-500/20 text-blue-400"   :
                  fase === "Media"  ? "bg-green-500/20 text-green-400" :
                  "bg-purple-500/20 text-purple-400"
                }`}>
                  Zona {fase}
                </span>
                {esRepeticion && (
                  <span className="text-xs font-body font-semibold px-2 py-1 rounded-full bg-accent/20 text-accent">
                    Repetición
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-body">
                {intentos > 0 ? `${intentos} intento${intentos > 1 ? "s" : ""}` : ""}
              </span>
            </div>

            {/* Nota grande */}
            <div className="text-center mb-6">
              <div className="text-7xl font-heading font-bold text-primary mb-1">{notaActual}</div>
              <p className="text-xs font-body text-muted-foreground">
                {sexo === "mujer" ? "Nota para voz femenina" : "Nota para voz masculina"}
              </p>
            </div>

            {/* Instrucción rápida */}
            <div className="bg-muted/50 rounded-xl p-3 mb-5 text-center">
              <p className="text-xs font-body text-muted-foreground">
                🎹 Escucha la nota → 🎤 Graba 3 s imitándola → 🔊 Escúchate → ✅ Confirma
              </p>
            </div>

            {/* Controles principales */}
            <div className="grid grid-cols-3 gap-3 mb-4">

              {/* Botón piano (toggle) */}
              <div className="flex flex-col items-center gap-1">
                <button onClick={reproducirPiano} disabled={grabando}
                  title={reproduciendo ? "Detener nota" : "Escuchar nota de referencia"}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    reproduciendo
                      ? "bg-blue-500/20 border-2 border-blue-400"
                      : "bg-card border-2 border-border hover:border-primary hover:scale-105"
                  } disabled:opacity-40`}>
                  {reproduciendo
                    ? <Volume2 className="w-6 h-6 text-blue-400 animate-pulse" />
                    : <Play className="w-6 h-6 text-primary" />}
                </button>
                <span className="text-xs font-body text-muted-foreground text-center leading-tight">
                  {reproduciendo ? "Detener" : "Referencia"}
                </span>
              </div>

              {/* Botón grabar / detener */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={grabando ? detenerGrabacion : iniciarGrabacion}
                  disabled={subiendo}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    grabando
                      ? "bg-red-500 border-2 border-red-400 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                      : "bg-primary border-2 border-primary hover:scale-105 shadow-vocalia-button"
                  } disabled:opacity-40`}>
                  {grabando
                    ? <Square className="w-6 h-6 text-white" />
                    : <Mic className="w-6 h-6 text-primary-foreground" />}
                </button>
                <span className="text-xs font-body text-muted-foreground text-center leading-tight">
                  {grabando ? "Detener" : "Grabar"}
                </span>
              </div>

              {/* Botón escuchar grabación (toggle) */}
              <div className="flex flex-col items-center gap-1">
                <button onClick={reproducirGrabacion} disabled={!bloqueGrabado || grabando}
                  title={reproduciendoblock ? "Detener grabación" : "Escuchar tu grabación"}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    reproduciendoblock
                      ? "bg-green-500/20 border-2 border-green-400"
                      : bloqueGrabado
                        ? "bg-card border-2 border-green-500/50 hover:border-green-400 hover:scale-105"
                        : "bg-card border-2 border-border opacity-40"
                  }`}>
                  {reproduciendoblock
                    ? <Volume2 className="w-6 h-6 text-green-400 animate-pulse" />
                    : <Volume2 className="w-6 h-6 text-muted-foreground" />}
                </button>
                <span className="text-xs font-body text-muted-foreground text-center leading-tight">
                  {reproduciendoblock ? "Detener" : "Escuchar"}
                </span>
              </div>
            </div>

            {/* Visualización de grabación activa */}
            {grabando && (
              <div className="flex items-center justify-center gap-1 mb-4 h-8">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="w-1 bg-red-400/70 rounded-full animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.04}s`,
                      animationDuration: `${0.3 + Math.random() * 0.4}s`,
                    }} />
                ))}
              </div>
            )}

            {/* Estado grabación lista */}
            {bloqueGrabado && !grabando && !pitchResult && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-xs font-body text-green-400">
                  Grabación lista. Escúchala antes de confirmar, o repítela si lo deseas.
                </p>
              </div>
            )}

            {/* Resultado de afinación (aparece tras enviar) */}
            {pitchResult && (
              <div className="bg-card border border-border rounded-xl p-4 mb-4">
                <p className="text-xs font-body font-semibold text-card-foreground mb-2 text-center">
                  📊 Análisis de afinación — {pitchResult.nota_ref}
                </p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Nota real</p>
                    <p className="text-sm font-mono font-bold text-card-foreground">{pitchResult.ref_hz} Hz</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tu voz</p>
                    <p className="text-sm font-mono font-bold text-card-foreground">{pitchResult.detected_hz} Hz</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Desviación</p>
                    <p className="text-sm font-mono font-bold text-card-foreground">
                      {pitchResult.cents_deviation > 0 ? "+" : ""}{pitchResult.cents_deviation} ¢
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Afinación</p>
                    <p className={`text-sm font-bold ${ratingColor[pitchResult.rating] ?? "text-card-foreground"}`}>
                      {pitchResult.rating}
                    </p>
                  </div>
                </div>
                {!pitchResult.en_rango_humano && (
                  <p className="text-[10px] text-yellow-400 text-center mt-2">
                    ⚠️ Fuera del margen humano (±100 ¢). El dato igual se guarda para el dataset.
                  </p>
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3">
              <button onClick={reintentarGrabacion} disabled={!bloqueGrabado || grabando || subiendo}
                className="flex-1 py-2.5 rounded-xl border-2 border-border text-muted-foreground font-body text-sm hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-30">
                <RotateCcw className="w-4 h-4" /> Repetir
              </button>
              <button onClick={confirmarYSiguiente} disabled={!bloqueGrabado || grabando || subiendo}
                className="flex-2 flex-grow py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:scale-100">
                {subiendo
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                  : <>Siguiente <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );

  // ── Paso 4: Fin ────────────────────────────────────────────────────────
  return (
    <Wrapper>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="animate-slide-up max-w-md w-full">
          <div className="bg-card/90 backdrop-blur-md rounded-3xl p-8 border border-border shadow-vocalia text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-card-foreground mb-2">¡Muchas gracias! 🎉</h2>
            <p className="text-sm font-body text-muted-foreground mb-4">
              Completaste las {totalNotas} grabaciones. Tu contribución es clave para entrenar la IA de VocalIA.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <p className="text-xs font-body text-muted-foreground">
                ID de sesión: <span className="font-mono text-primary">{sessionId}</span>
              </p>
              <p className="text-xs font-body text-muted-foreground mt-1">
                Tus {totalNotas} muestras quedaron guardadas de forma anónima.
              </p>
            </div>
            <button onClick={onBack}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-105 transition-all">
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default DatasetCollectionScreen;
