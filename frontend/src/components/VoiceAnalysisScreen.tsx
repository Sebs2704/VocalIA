import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Music, BarChart2, ChevronLeft, RefreshCw, Share2, Users, User, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { apiExtractFreq, apiAnalyzeVoice, apiGetArtistMatch, ArtistMatchResult, VoiceAnalysisResult, VoiceRange, ExtractFreqResult } from "@/lib/api";
import { getArtistImage, extractArtist } from "@/lib/artistImages";
import backgroundImg from "@/assets/background.png";

// ── Pitch detection (autocorrelación) ────────────────────────────────────────
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX  = Math.floor(SIZE / 2);
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.005) return -1;

  let best = -1, bestCorr = 0, lastCorr = 1;
  let foundGood = false;
  const corrs: number[] = new Array(MAX);

  for (let offset = 0; offset < MAX; offset++) {
    let corr = 0;
    for (let i = 0; i < MAX; i++) corr += Math.abs(buffer[i] - buffer[i + offset]);
    corr = 1 - corr / MAX;
    corrs[offset] = corr;
    if (corr > 0.7 && corr > lastCorr) {
      foundGood = true;
      if (corr > bestCorr) { bestCorr = corr; best = offset; }
    } else if (foundGood) {
      const shift = (corrs[best + 1] - corrs[best - 1]) / corrs[best];
      return sampleRate / (best + 8 * shift);
    }
    lastCorr = corr;
  }
  return best > 0 && bestCorr > 0.01 ? sampleRate / best : -1;
}

function hzToNoteName(hz: number): string {
  if (hz <= 0) return "—";
  const semitones = Math.round(12 * Math.log2(hz / 440.0));
  const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const midi  = semitones + 69;
  return `${notes[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

// ── Definición de los 3 pasos ─────────────────────────────────────────────────
const MIN_RECORD_MS = 3000;

const STEPS = [
  {
    tipo:        "min" as const,
    titulo:      "Tu nota más baja",
    instruccion: "Canta \"Aaaah\" en la nota más baja que puedas sostener. Aguanta al menos 3 segundos sin soltar la voz.",
    color:       "text-blue-400",
    bgColor:     "bg-blue-500/10 border-blue-500/30",
    icon:        "↓",
  },
  {
    tipo:        "max" as const,
    titulo:      "Tu nota más alta",
    instruccion: "Canta \"Aaaah\" en la nota más alta que puedas sostener. Aguanta al menos 3 segundos sin soltar la voz.",
    color:       "text-fuchsia-400",
    bgColor:     "bg-fuchsia-500/10 border-fuchsia-500/30",
    icon:        "↑",
  },
  {
    tipo:        "base" as const,
    titulo:      "Tu nota cómoda",
    instruccion: "Canta una frase de cualquier canción con una nota en la que te sientas cómodo/a, sin forzar ni esforzar la voz. Elige el tono que sale de forma natural al cantar.",
    color:       "text-primary",
    bgColor:     "bg-primary/10 border-primary/30",
    icon:        "◎",
  },
] as const;

// ── Barra de compatibilidad ───────────────────────────────────────────────────
function CompatBar({ value }: { value: number }) {
  const pct   = Math.min(value, 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden" title={`${pct}% compatibilidad`}>
      {/* eslint-disable-next-line react/forbid-dom-props */}
      <div className={`${color} h-full rounded-full transition-all duration-700`}
           style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  onBack:              () => void;
  onGoToDashboard?:    () => void;
  userSex?:            string;
  onShareResults?:     (songs: import("@/lib/api").SongResult[], minFreq: number, maxFreq: number, baseFreq: number) => void;
  onVoiceAnalyzed?:    (voiceRange: VoiceRange) => void;
}

// ── Pantalla de elección de género ────────────────────────────────────────────
const T = {
  dark:   "hsl(200,55%,22%)",
  mid:    "hsl(200,50%,34%)",
  light:  "hsl(200,47%,44%)",
  shadow: "rgba(0,60,100,",
};

interface GenderChoiceProps {
  userSex: string;
  onChoose: (mode: "both" | "filtered") => void;
  onBack: () => void;
}

function GenderChoiceScreen({ userSex, onChoose, onBack }: GenderChoiceProps) {
  const sexLabel = userSex === "masculino" ? "masculinos" : "femeninos";

  const options = [
    {
      mode: "both" as const,
      icon: Users,
      title: "Todos los géneros",
      desc: "Ver las canciones con mayor compatibilidad sin importar el género del artista.",
    },
    {
      mode: "filtered" as const,
      icon: User,
      title: `Solo artistas ${sexLabel}`,
      desc: `Filtrar los resultados para mostrar únicamente canciones de artistas ${sexLabel}, acorde a tu sexo biológico.`,
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }} />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/40 to-background/70" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body text-sm">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <h1 className="font-heading font-bold text-lg text-foreground">
          Vocal<span className="text-primary">IA</span>
        </h1>
        <div className="w-16" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Título */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
              <Music className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
              ¿Cómo ver tus resultados?
            </h2>
            <p className="text-muted-foreground font-body text-sm max-w-xs mx-auto">
              Elige cómo quieres que se muestren las canciones más compatibles con tu voz.
            </p>
          </div>

          {/* Opciones */}
          <div className="space-y-3">
            {options.map(({ mode, icon: Icon, title, desc }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChoose(mode)}
                className="w-full text-left rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(12px)",
                  boxShadow: `0 4px 16px ${T.shadow}0.12), inset 0 1px 0 rgba(255,255,255,0.18)`,
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${T.dark} 0%, ${T.mid} 100%)`,
                      boxShadow: `0 2px 8px ${T.shadow}0.25)`,
                    }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground text-sm mb-1">{title}</p>
                    <p className="font-body text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function VoiceAnalysisScreen({ onBack, onShareResults, onVoiceAnalyzed, userSex }: Props) {
  const [genderMode, setGenderMode]   = useState<"both" | "filtered" | null>(
    userSex ? null : "both"  // si no hay sexo guardado, saltar directamente a "both"
  );
  const [stepIndex, setStepIndex]     = useState(0);
  const [phase, setPhase]             = useState<"idle" | "recording" | "processing">("idle");
  const [currentHz, setCurrentHz]     = useState(-1);
  const [confirmed, setConfirmed]     = useState<{freq: number; nota: string}[]>([]);
  const [stepStats, setStepStats]     = useState<ExtractFreqResult[]>([]);
  const [result, setResult]           = useState<VoiceAnalysisResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [artistMatch, setArtistMatch]         = useState<ArtistMatchResult | null>(null);
  const [loadingArtist, setLoadingArtist]     = useState(false);
  const [recElapsed, setRecElapsed]   = useState(0);
  const recStartRef = useRef<number>(0);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef      = useRef<number>(0);
  const bufferRef   = useRef<Float32Array | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    stopPitch();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const stopPitch = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const startPitch = useCallback((stream: MediaStream) => {
    const ctx      = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    audioCtxRef.current = ctx;
    bufferRef.current   = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(bufferRef.current! as Float32Array<ArrayBuffer>);
      const hz = autoCorrelate(bufferRef.current!, ctx.sampleRate);
      if (hz > 50 && hz < 1200) setCurrentHz(hz);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Iniciar grabación ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null);
    setCurrentHz(-1);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setError("No se pudo acceder al micrófono. Verifica los permisos.");
      return;
    }
    streamRef.current = stream;
    startPitch(stream);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : "audio/webm";
    const rec = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.start(100);
    mediaRecRef.current = rec;
    recStartRef.current = Date.now();
    setRecElapsed(0);
    timerRef.current = setInterval(() => {
      setRecElapsed(Date.now() - recStartRef.current);
    }, 100);
    setPhase("recording");
  }, [startPitch]);

  // ── Detener grabación → enviar al backend ───────────────────────────────────
  const stopRecording = useCallback(() => {
    if (!mediaRecRef.current) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const step = STEPS[stepIndex];

    mediaRecRef.current.onstop = async () => {
      stopPitch();
      setPhase("processing");
      const blob = new Blob(chunksRef.current, { type: mediaRecRef.current!.mimeType });
      try {
        const data = await apiExtractFreq(blob, step.tipo);
        const newConfirmed = [...confirmed, { freq: data.frequency, nota: data.nota }];
        const newStepStats = [...stepStats, data];
        setConfirmed(newConfirmed);
        setStepStats(newStepStats);
        setPhase("idle");
        setCurrentHz(-1);

        if (stepIndex === 2) {
          setStepIndex(3);
          const baseStats = newStepStats[2];
          try {
            const sexFilter: "M" | "F" | undefined =
              genderMode === "filtered" && userSex
                ? (userSex === "masculino" ? "M" : "F")
                : undefined;
            const analysis = await apiAnalyzeVoice(
              newConfirmed[0].freq,
              newConfirmed[1].freq,
              newConfirmed[2].freq,
              {
                medianFreq: baseStats?.mediana,
                p10Base:    baseStats?.p10,
                p90Base:    baseStats?.p90,
                rangoBase:  baseStats?.rango,
                sexFilter,
              },
            );
            setResult(analysis);
            setStepIndex(4);
            if (analysis.saved && analysis.voice_range) {
              onVoiceAnalyzed?.(analysis.voice_range);
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error al analizar";
            toast.error(msg);
            setStepIndex(2);
            setConfirmed(newConfirmed.slice(0, 2));
            setStepStats(newStepStats.slice(0, 2));
          }
        } else {
          setStepIndex(prev => prev + 1);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error al procesar grabación";
        setError(msg);
        toast.error(msg);
        setPhase("idle");
      }
    };
    mediaRecRef.current.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, [stepIndex, confirmed, stopPitch, genderMode, userSex]);

  const reset = () => {
    setStepIndex(0);
    setPhase("idle");
    setConfirmed([]);
    setStepStats([]);
    setResult(null);
    setError(null);
    setCurrentHz(-1);
    setArtistMatch(null);
    setLoadingArtist(false);
    if (userSex) setGenderMode(null);
  };

  const handleArtistMatch = useCallback(async () => {
    if (!result) return;
    setLoadingArtist(true);
    setArtistMatch(null);
    try {
      const sex: "M" | "F" | null =
        userSex === "masculino" ? "M" : userSex === "femenino" ? "F" : null;
      const medianFreq = stepStats[2]?.mediana ?? null;
      const match = await apiGetArtistMatch(
        result.base_freq, result.min_freq, result.max_freq, medianFreq, sex,
      );
      setArtistMatch(match);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al buscar artista");
    } finally {
      setLoadingArtist(false);
    }
  }, [result, userSex, stepStats]);

  // ── Pantalla de elección de género ─────────────────────────────────────────
  if (genderMode === null && userSex) {
    return (
      <GenderChoiceScreen
        userSex={userSex}
        onChoose={(mode) => setGenderMode(mode)}
        onBack={onBack}
      />
    );
  }

  const step = stepIndex < 3 ? STEPS[Math.min(stepIndex, 2)] : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImg})` }} />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/40 to-background/70" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body text-sm">
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        <h1 className="font-heading font-bold text-lg text-foreground">
          Vocal<span className="text-primary">IA</span>
        </h1>
        <div className="w-16" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 pb-12">

        {/* ── PASOS 1-2-3: grabación ────────────────────────────────────── */}
        {stepIndex < 3 && step && (
          <div className="flex flex-col items-center text-center max-w-lg w-full mt-2">

            {/* Indicador de progreso */}
            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((_s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-heading font-bold border
                    ${i < confirmed.length
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : i === stepIndex
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-primary/10 border-primary/40 text-primary/50"}`}>
                    {i < confirmed.length ? "✓" : i + 1}
                  </div>
                  {i < 2 && <div className={`w-8 h-px ${i < stepIndex ? "bg-green-500" : "bg-primary/30"}`} />}
                </div>
              ))}
            </div>

            {/* Frecuencias confirmadas */}
            {confirmed.length > 0 && (
              <div className="flex gap-3 mb-4 w-full">
                {confirmed.map((c, i) => (
                  <div key={i} className={`flex-1 rounded-xl border p-2 text-center ${STEPS[i].bgColor}`}>
                    <p className={`text-xs font-body mb-0.5 ${STEPS[i].color}`}>{STEPS[i].titulo}</p>
                    <p className={`text-lg font-heading font-bold tabular-nums ${STEPS[i].color}`}>
                      {Math.round(c.freq)} Hz
                    </p>
                    <p className="text-xs text-muted-foreground/60 font-body">{c.nota}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tarjeta del paso actual */}
            <h2 className={`text-2xl font-heading font-bold mb-1 ${step.color}`}>
              {step.icon} {step.titulo}
            </h2>
            <p className="text-muted-foreground font-body text-sm mb-6 max-w-sm">
              {step.instruccion}
            </p>

            {/* Visualizador Hz */}
            <div className={`w-full max-w-xs rounded-2xl border p-6 mb-8 transition-all duration-300
              ${phase === "recording" ? step.bgColor : "bg-primary/10 border-primary/40"}`}>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground font-body uppercase tracking-widest mb-1">
                  Frecuencia detectada
                </span>
                <span className={`text-5xl font-heading font-bold tabular-nums transition-all
                  ${phase === "recording" && currentHz > 0 ? step.color : "text-muted-foreground/40"}`}>
                  {phase === "recording" && currentHz > 0 ? Math.round(currentHz) : "---"}
                </span>
                <span className="text-muted-foreground text-sm font-body">Hz</span>
                {phase === "recording" && currentHz > 0 && (
                  <span className="text-xs text-muted-foreground/70 font-body mt-1">
                    Nota: {hzToNoteName(currentHz)}
                  </span>
                )}
              </div>
            </div>

            {/* Botón mic */}
            {phase === "idle" && (
              <button type="button" aria-label="Iniciar grabación" onClick={startRecording}
                className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center
                           shadow-vocalia-button hover:scale-105 transition-all duration-200 animate-pulse-glow">
                <Mic className="w-10 h-10" />
              </button>
            )}
            {phase === "recording" && (() => {
              const ready = recElapsed >= MIN_RECORD_MS;
              const pct   = Math.min(recElapsed / MIN_RECORD_MS * 100, 100);
              const remaining = Math.ceil((MIN_RECORD_MS - recElapsed) / 1000);
              return (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-24 h-24">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="44" fill="none" stroke="currentColor"
                        className="text-white/10" strokeWidth="4" />
                      <circle cx="48" cy="48" r="44" fill="none"
                        stroke={ready ? "#ef4444" : "#60a5fa"}
                        strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 44}`}
                        strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
                        strokeLinecap="round"
                        className="rec-arc-transition"
                      />
                    </svg>
                    <button
                      type="button"
                      aria-label="Detener grabación"
                      onClick={ready ? stopRecording : undefined}
                      disabled={!ready}
                      className={`absolute inset-1 rounded-full flex items-center justify-center transition-all duration-200
                        ${ready
                          ? "bg-destructive text-destructive-foreground hover:scale-105 cursor-pointer animate-pulse"
                          : "bg-blue-500/20 text-blue-400 cursor-not-allowed"}`}>
                      {ready ? <MicOff className="w-9 h-9" /> : <span className="text-2xl font-bold font-heading">{remaining}</span>}
                    </button>
                  </div>
                  <p className="text-xs font-body text-muted-foreground/70">
                    {ready ? "Toca para detener" : `Aguanta ${remaining}s más…`}
                  </p>
                </div>
              );
            })()}
            {phase === "processing" && (
              <div className="w-24 h-24 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center animate-spin">
                <BarChart2 className="w-8 h-8 text-primary" />
              </div>
            )}

            <p className="text-xs text-muted-foreground/60 font-body mt-4">
              {phase === "idle"      && "Toca el micrófono para comenzar"}
              {phase === "recording" && "Toca para detener la grabación"}
              {phase === "processing" && "Procesando…"}
            </p>

            {error && (
              <div className="mt-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl
                              text-destructive text-sm font-body text-center">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── ANALIZANDO ────────────────────────────────────────────────── */}
        {stepIndex === 3 && (
          <div className="flex flex-col items-center gap-6 mt-20">
            <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/40
                            flex items-center justify-center animate-spin">
              <BarChart2 className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-heading text-xl font-semibold">Analizando tu voz…</p>
            <p className="text-muted-foreground text-sm font-body text-center max-w-xs">
              Buscando canciones compatibles con tu voz mediante IA…
            </p>
          </div>
        )}

        {/* ── RESULTADOS ────────────────────────────────────────────────── */}
        {stepIndex === 4 && result && (
          <div className="w-full max-w-lg space-y-4 mt-2">

            {/* Frecuencias */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-foreground text-sm uppercase tracking-wide">
                  Tus frecuencias
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Mínima",  value: result.min_freq,  color: "text-blue-400" },
                  { label: "Base",    value: result.base_freq, color: "text-primary" },
                  { label: "Máxima",  value: result.max_freq,  color: "text-fuchsia-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center bg-background/40 rounded-xl p-2 sm:p-3">
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-body mb-1">{label}</span>
                    <span className={`text-lg sm:text-xl font-heading font-bold tabular-nums ${color}`}>
                      {Math.round(value)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-body">Hz</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground/50 font-body mt-0.5">
                      {hzToNoteName(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top canciones */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-y-2">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  <h3 className="font-heading font-semibold text-foreground text-sm uppercase tracking-wide">
                    Canciones recomendadas
                  </h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Badge de modo de filtro */}
                  {genderMode === "filtered" && (
                    <span className="text-[10px] font-body px-2 py-0.5 rounded-full border bg-primary/10 border-primary/40 text-primary">
                      {userSex === "masculino" ? "♂ filtrado" : "♀ filtrado"}
                    </span>
                  )}
                  <span className={`text-xs font-body px-2 py-0.5 rounded-full border ${
                    result.model_used === "weka"
                      ? "bg-green-500/10 border-green-500/40 text-green-400"
                      : result.model_used === "sklearn"
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
                      : "bg-muted/30 border-border text-muted-foreground"
                  }`}>
                    {result.model_used === "weka"    ? "Weka MLP"
                    : result.model_used === "sklearn" ? "sklearn MLP"
                    : "Reglas"}
                  </span>
                </div>
              </div>

              {result.top_songs.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground font-body text-sm">
                    No se encontraron canciones compatibles para este filtro.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.top_songs.map((song, i) => {
                    const artistImg  = getArtistImage(song.nombre);
                    const artistName = extractArtist(song.nombre);
                    const songTitle  = song.nombre.includes(" - ")
                      ? song.nombre.slice(0, song.nombre.lastIndexOf(" - ")).trim()
                      : song.nombre;
                    return (
                      <div key={i} className="flex items-center gap-3 bg-background/40 rounded-xl p-3">
                        <div className="relative shrink-0">
                          {artistImg ? (
                            <img
                              src={artistImg}
                              alt={artistName}
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/30"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary font-heading font-bold text-sm">{i + 1}</span>
                            </div>
                          )}
                          {artistImg && (
                            <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary
                                             flex items-center justify-center text-primary-foreground
                                             font-heading font-bold text-[10px] ring-1 ring-background">
                              {i + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-body font-medium text-sm truncate leading-tight">
                            {songTitle}
                          </p>
                          <p className="text-primary/80 font-body text-xs font-medium truncate">
                            {artistName}
                          </p>
                          <p className="text-muted-foreground/60 font-body text-xs">
                            {song.bpm > 0 ? `${Math.round(song.bpm)} BPM` : ""}
                          </p>
                          <CompatBar value={song.compatibilidad} />
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-sm font-heading font-bold
                            ${song.compatibilidad >= 70 ? "text-green-400"
                            : song.compatibilidad >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                            {song.compatibilidad}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Artista más similar ─────────────────────────────────── */}
            {!artistMatch ? (
              <button
                type="button"
                onClick={handleArtistMatch}
                disabled={loadingArtist}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-3
                           font-heading font-semibold text-white transition-all duration-200
                           hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${T.dark} 0%, ${T.mid} 60%, ${T.light} 100%)`,
                  boxShadow: `0 4px 20px ${T.shadow}0.30)`,
                }}
              >
                {loadingArtist
                  ? <RefreshCw className="w-5 h-5 animate-spin" />
                  : <Wand2 className="w-5 h-5" />}
                {loadingArtist ? "Buscando tu artista…" : "¿Cuál artista se asemeja más a tu voz?"}
              </button>
            ) : (
              <div className="bg-card/80 backdrop-blur-sm border border-primary/25 rounded-2xl overflow-hidden">
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-5 font-body">
                    Tu voz se asemeja a...
                  </p>
                  <div className="flex justify-center mb-4">
                    {getArtistImage(artistMatch.artista) ? (
                      <img
                        src={getArtistImage(artistMatch.artista)}
                        alt={artistMatch.artista}
                        className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-primary/30 shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary/20 border-4 border-primary/30
                                      flex items-center justify-center">
                        <Mic className="w-10 h-10 sm:w-14 sm:h-14 text-primary" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">
                    {artistMatch.artista}
                  </h3>
                  <span className="inline-block px-3 py-1 rounded-full bg-primary/15 border border-primary/30
                                   text-primary text-sm font-body font-medium mb-4">
                    {artistMatch.genero_musical}
                  </span>
                  <div className="px-4">
                    <div className="flex items-center justify-between text-xs font-body text-muted-foreground mb-1">
                      <span>Similitud vocal</span>
                      <span className={`font-semibold ${
                        artistMatch.score >= 70 ? "text-green-400"
                        : artistMatch.score >= 40 ? "text-yellow-400" : "text-red-400"
                      }`}>{artistMatch.score}%</span>
                    </div>
                    <CompatBar value={artistMatch.score} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setArtistMatch(null)}
                  className="w-full py-2.5 text-xs font-body text-muted-foreground hover:text-foreground
                             transition-colors border-t border-border/30 bg-background/20"
                >
                  Buscar nuevamente
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {onShareResults && result.top_songs.length > 0 && (
                <button
                  type="button"
                  onClick={() => onShareResults(result.top_songs, result.min_freq, result.max_freq, result.base_freq)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                             bg-primary text-primary-foreground font-body font-medium text-sm
                             hover:opacity-90 transition-all duration-200"
                >
                  <Share2 className="w-4 h-4" /> Compartir resultados
                </button>
              )}
              <button type="button" onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                           border border-primary/40 text-primary font-body font-medium text-sm
                           hover:bg-primary/10 transition-all duration-200">
                <RefreshCw className="w-4 h-4" /> Analizar de nuevo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
