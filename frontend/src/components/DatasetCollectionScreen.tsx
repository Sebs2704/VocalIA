import { useState, useRef, useEffect } from "react";
import backgroundImg from "@/assets/background.png";
import logoImg from "@/assets/logo.png";
import {
  Mic, ArrowLeft, Play, Square, RotateCcw,
  ChevronRight, CheckCircle, Volume2, Loader2, XCircle
} from "lucide-react";
import { apiSubmitSample } from "@/lib/api";
import { toast } from "sonner";
 
interface DatasetCollectionScreenProps {
  onBack: () => void;
}
 
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
 
function getAudioUrl(nota: string, sexo: string): string {
  const carpeta = sexo === "mujer" ? "mujer" : "hombre";
  return `/Audio/piano/${carpeta}/${nota}.wav`;
}
 
function generarSessionId(): string {
  const stored = sessionStorage.getItem("vocalia_session_id");
  if (stored) return stored;
  const id = "ANON-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  sessionStorage.setItem("vocalia_session_id", id);
  return id;
}
 
const DatasetCollectionScreen = ({ onBack }: DatasetCollectionScreenProps) => {
  const [paso, setPaso]           = useState<"sexo"|"instrucciones"|"grabacion"|"fin">("sexo");
  const [sexo, setSexo]           = useState<"mujer"|"hombre"|null>(null);
  const [sessionId]               = useState<string>(generarSessionId);
  const [indiceNota, setIndiceNota] = useState(0);
  const [grabando, setGrabando]   = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [bloqueGrabado, setBloqueGrabado] = useState<Blob | null>(null);
  const [reproduciendoblock, setReproduciendoBlob] = useState(false);
  const [subiendo, setSubiendo]   = useState(false);
  const [intentos, setIntentos]   = useState(0);
  const [ultimoAnalisis, setUltimoAnalisis] = useState<any>(null);
  const [resultadoFinal, setResultadoFinal] = useState<any>(null);
 
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const audioRefPiano    = useRef<HTMLAudioElement | null>(null);
  const audioRefBlob     = useRef<HTMLAudioElement | null>(null);
  const timerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  const notas       = sexo === "mujer" ? NOTAS_MUJER : NOTAS_HOMBRE;
  const notaActual  = notas[indiceNota];
  const totalNotas  = notas.length;
  const progreso    = Math.round((indiceNota / totalNotas) * 100);
  const fase        = sexo ? getFase(notaActual, sexo) : "";
  const esRepeticion= indiceNota > 0 && notaActual === notas[indiceNota - 1];
  const esUltima    = indiceNota === totalNotas - 1;
 
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      audioRefPiano.current?.pause();
      audioRefBlob.current?.pause();
    };
  }, []);

  const reproducirPiano = () => {
    if (!sexo) return;
    audioRefPiano.current?.pause();
    const audio = new Audio(getAudioUrl(notaActual, sexo));
    audioRefPiano.current = audio;
    setReproduciendo(true);
    audio.play().catch(() => toast.error("No se pudo cargar el audio de referencia"));
    audio.onended = () => setReproduciendo(false);
    audio.onerror = () => setReproduciendo(false);
  };

  const iniciarGrabacion = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunksRef.current.length === 0) {
          toast.error("No se capturó audio. Verifica los permisos del micrófono.");
          setGrabando(false);
          return;
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setBloqueGrabado(blob);
        setGrabando(false);
        setIntentos(i => i + 1);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setGrabando(true);
      setBloqueGrabado(null);
      setUltimoAnalisis(null);
      timerRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 8000);
    } catch {
      toast.error("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  const detenerGrabacion = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  };
 
  const reproducirGrabacion = () => {
    if (!bloqueGrabado) return;

    if (bloqueGrabado.size === 0) {
      toast.error("La grabación está vacía. Vuelve a grabar.");
      return;
    }

    const url = URL.createObjectURL(bloqueGrabado);
    if (audioRefBlob.current) {
      audioRefBlob.current.pause();
      audioRefBlob.current.src = "";
    }
    const audio = new Audio(url);
    audioRefBlob.current = audio;

    audio.onended = () => {
      setReproduciendoBlob(false);
      URL.revokeObjectURL(url);
    };

    setReproduciendoBlob(true);
    audio.play().catch(() => {
      setReproduciendoBlob(false);
      URL.revokeObjectURL(url);
      toast.error("No se pudo reproducir el audio.");
    });
  };
 
  const confirmarYSiguiente = async () => {
    if (!bloqueGrabado || !sexo) return;
    setSubiendo(true);
    try {
      const res = await apiSubmitSample(
        bloqueGrabado, sexo, sessionId, notaActual, intentos, esUltima
      );
      if (res.analysis) setUltimoAnalisis(res.analysis);
      if (res.analysis_warning) {
        console.warn("Advertencia de análisis:", res.analysis_warning);
        toast.warning(`Análisis: ${res.analysis_warning.includes("ffmpeg") || res.analysis_warning.includes("codec") ? "Instala ffmpeg para mejorar el análisis de audio" : res.analysis_warning}`);
      }
 
      if (esUltima) {
        setResultadoFinal(res);
        sessionStorage.removeItem("vocalia_session_id");
        setPaso("fin");
      } else {
        setIndiceNota(i => i + 1);
        setBloqueGrabado(null);
        setIntentos(0);
        setUltimoAnalisis(null);
      }
    } catch (e: any) {
      toast.error(e.message || "Error al enviar la muestra");
    } finally {
      setSubiendo(false);
    }
  };
 
  const reintentarGrabacion = () => {
    setBloqueGrabado(null);
    setUltimoAnalisis(null);
  };
 
  // ── Wrapper ──────────────────────────────────────────────────────────────
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
 
  // ── Paso 1: Sexo ──────────────────────────────────────────────────────────
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
              Tu grabación es <strong>completamente anónima</strong>.
            </p>
            <p className="text-xs font-mono text-primary mb-6">ID de sesión: {sessionId}</p>
            <p className="text-sm font-body font-medium text-card-foreground mb-4">¿Cuál es tu sexo biológico?</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { value: "mujer",  label: "Mujer",  emoji: "🎶", notas: 15 },
                { value: "hombre", label: "Hombre", emoji: "🎵", notas: 18 },
              ].map(opt => (
                <button key={opt.value} onClick={() => setSexo(opt.value as any)}
                  className={`p-4 rounded-2xl border-2 font-body text-sm font-medium transition-all hover:scale-105 ${sexo === opt.value ? "border-primary bg-primary/15 text-primary" : "border-border bg-card/50 text-card-foreground hover:border-primary/50"}`}>
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
 
  // ── Paso 2: Instrucciones ─────────────────────────────────────────────────
  if (paso === "instrucciones") return (
    <Wrapper>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="animate-slide-up max-w-lg w-full">
          <div className="bg-card/90 backdrop-blur-md rounded-3xl p-8 border border-border shadow-vocalia">
            <h2 className="text-2xl font-heading font-bold text-card-foreground mb-2 text-center">¿Cómo funciona?</h2>
            <p className="text-sm font-body text-muted-foreground text-center mb-6">Lee esto antes de comenzar</p>
            <div className="space-y-4 mb-6">
              {[
                { n:"1", t:"Escucha la nota de referencia",  d:"Presiona ▶ para escuchar el piano. Repítelo las veces que quieras." },
                { n:"2", t:"Graba imitando la nota",         d:"Presiona 🎤 y canta o tararea la nota. Mantén el sonido al menos 3 segundos." },
                { n:"3", t:"Escucha tu grabación",           d:"Reproduce tu audio. Si no te convence, vuelve a grabar." },
                { n:"4", t:"Confirma y sigue",               d:"Cuando estés conforme presiona Siguiente." },
              ].map(item => (
                <div key={item.n} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{item.n}</span>
                  </div>
                  <div>
                    <p className="text-sm font-body font-semibold text-card-foreground">{item.t}</p>
                    <p className="text-xs font-body text-muted-foreground">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-primary/10 rounded-xl p-3 mb-6">
              <p className="text-xs font-body text-primary font-medium text-center">
                🎯 Consejo: No necesitas ser cantante. Solo imita el sonido lo mejor que puedas y sostén la nota.
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
 
  // ── Paso 3: Grabación ─────────────────────────────────────────────────────
  if (paso === "grabacion") return (
    <Wrapper>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="max-w-lg w-full space-y-4">
 
          {/* Progreso */}
          <div className="bg-card/80 backdrop-blur-md rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-body text-muted-foreground">Progreso</span>
              <span className="text-xs font-body font-medium text-primary">{indiceNota + 1} / {totalNotas}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
            </div>
          </div>
 
          {/* Nota */}
          <div className="bg-card/90 backdrop-blur-md rounded-3xl p-6 border border-border shadow-vocalia">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <span className={`text-xs font-body font-semibold px-2 py-1 rounded-full ${fase === "Grave" ? "bg-blue-500/20 text-blue-400" : fase === "Media" ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"}`}>
                  Zona {fase}
                </span>
                {esRepeticion && <span className="text-xs font-body font-semibold px-2 py-1 rounded-full bg-accent/20 text-accent">Repetición</span>}
                {esUltima     && <span className="text-xs font-body font-semibold px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">Última nota</span>}
              </div>
              <span className="text-xs text-muted-foreground font-body">{intentos > 0 ? `${intentos} intento${intentos > 1 ? "s" : ""}` : ""}</span>
            </div>
 
            <div className="text-center mb-4">
              <div className="text-7xl font-heading font-bold text-primary mb-1">{notaActual}</div>
              <p className="text-xs font-body text-muted-foreground">
                Referencia: <span className="font-mono text-primary">{NOTE_FREQUENCIES_DISPLAY[notaActual] ?? ""} Hz</span>
              </p>
            </div>
 
            <div className="bg-muted/50 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs font-body text-muted-foreground">🎹 Escucha → 🎤 Graba (mín 2.5 seg) → 🔊 Escucha → ✅ Confirma</p>
            </div>
 
            {/* Controles */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="flex flex-col items-center gap-1">
                <button onClick={reproducirPiano} disabled={grabando || reproduciendo}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${reproduciendo ? "bg-blue-500/20 border-2 border-blue-400" : "bg-card border-2 border-border hover:border-primary hover:scale-105"} disabled:opacity-40`}>
                  {reproduciendo ? <Volume2 className="w-6 h-6 text-blue-400 animate-pulse" /> : <Play className="w-6 h-6 text-primary" />}
                </button>
                <span className="text-xs font-body text-muted-foreground">Referencia</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button onClick={grabando ? detenerGrabacion : iniciarGrabacion} disabled={reproduciendo || subiendo}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${grabando ? "bg-red-500 border-2 border-red-400 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "bg-primary border-2 border-primary hover:scale-105 shadow-vocalia-button"} disabled:opacity-40`}>
                  {grabando ? <Square className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-primary-foreground" />}
                </button>
                <span className="text-xs font-body text-muted-foreground">{grabando ? "Detener" : "Grabar"}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button type="button" aria-label="Escuchar grabación" onClick={reproducirGrabacion} disabled={!bloqueGrabado || grabando || reproduciendoblock}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${reproduciendoblock ? "bg-green-500/20 border-2 border-green-400" : bloqueGrabado ? "bg-card border-2 border-green-500/50 hover:border-green-400 hover:scale-105" : "bg-card border-2 border-border opacity-40"}`}>
                  <Volume2 className={`w-6 h-6 ${reproduciendoblock ? "text-green-400 animate-pulse" : "text-muted-foreground"}`} />
                </button>
                <span className="text-xs font-body text-muted-foreground">Escuchar</span>
              </div>
            </div>
 
            {/* Barras de grabación */}
            {grabando && (
              <div className="flex items-end justify-center gap-1 mb-4 h-8">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="w-1 bg-red-400/70 rounded-full animate-pulse"
                    style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.04}s`, animationDuration: `${0.3 + Math.random() * 0.4}s` }} />
                ))}
              </div>
            )}
 
            {/* Resultado del análisis */}
            {ultimoAnalisis && !grabando && (
              <div className={`rounded-xl p-3 mb-4 border ${ultimoAnalisis.is_valid ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {ultimoAnalisis.is_valid
                    ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  <span className={`text-xs font-body font-semibold ${ultimoAnalisis.is_valid ? "text-green-400" : "text-red-400"}`}>
                    {ultimoAnalisis.is_valid ? "¡Nota válida!" : "Nota no válida"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-body text-muted-foreground">
                  <span>🎵 {ultimoAnalisis.detected_note} ({ultimoAnalisis.frequency} Hz)</span>
                  <span>📊 Estab: {(ultimoAnalisis.pitch_stability * 100).toFixed(0)}%</span>
                  <span>🔊 {ultimoAnalisis.intensity_db} dB</span>
                </div>
                {!ultimoAnalisis.is_valid && ultimoAnalisis.invalid_reasons?.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {ultimoAnalisis.invalid_reasons.map((r: string, i: number) => (
                      <li key={i} className="text-xs text-red-400">• {r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
 
            {bloqueGrabado && !grabando && !ultimoAnalisis && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-xs font-body text-green-400">Grabación lista. Escúchala antes de confirmar.</p>
              </div>
            )}
 
            <div className="flex gap-3">
              <button onClick={reintentarGrabacion} disabled={!bloqueGrabado || grabando || subiendo}
                className="flex-1 py-2.5 rounded-xl border-2 border-border text-muted-foreground font-body text-sm hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 disabled:opacity-30">
                <RotateCcw className="w-4 h-4" /> Repetir
              </button>
              <button onClick={confirmarYSiguiente} disabled={!bloqueGrabado || grabando || subiendo}
                className="flex-grow py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-semibold text-sm shadow-vocalia-button hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:scale-100">
                {subiendo ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <>{esUltima ? "Finalizar" : "Siguiente"} <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
 
  // ── Paso 4: Fin ───────────────────────────────────────────────────────────
  const esValido = resultadoFinal?.estado === "valido";
  return (
    <Wrapper>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="animate-slide-up max-w-md w-full">
          <div className="bg-card/90 backdrop-blur-md rounded-3xl p-8 border border-border shadow-vocalia text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${esValido ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
              {esValido
                ? <CheckCircle className="w-10 h-10 text-green-400" />
                : <XCircle className="w-10 h-10 text-yellow-400" />}
            </div>
            <h2 className="text-2xl font-heading font-bold text-card-foreground mb-2">
              {esValido ? "¡Gracias por tu contribución! 🎉" : "Sesión registrada"}
            </h2>
            <p className="text-sm font-body text-muted-foreground mb-4">
              {esValido
                ? "Tu sesión fue marcada como válida y será parte del entrenamiento de VocalIA."
                : "Tu sesión fue guardada. La estabilidad promedio estuvo por debajo del umbral requerido."}
            </p>
 
            {resultadoFinal && (
              <div className="bg-muted/50 rounded-xl p-4 mb-4 text-left space-y-2">
                <p className="text-xs font-body text-muted-foreground">
                  <span className="font-semibold text-card-foreground">ID:</span> {sessionId}
                </p>
                <p className="text-xs font-body text-muted-foreground">
                  <span className="font-semibold text-card-foreground">Estado:</span>{" "}
                  <span className={esValido ? "text-green-400" : "text-yellow-400"}>
                    {esValido ? "✅ Válido" : "⚠️ Guardado"}
                  </span>
                </p>
                {resultadoFinal.stats && (
                  <p className="text-xs font-body text-muted-foreground">
                    <span className="font-semibold text-card-foreground">Notas acertadas:</span>{" "}
                    <span className="text-primary font-semibold">
                      {resultadoFinal.stats.valid_samples} / {resultadoFinal.stats.total_samples}
                    </span>
                  </p>
                )}
                {resultadoFinal.range_detected && resultadoFinal.range_detected.based_on === "valid_notes_only" && (
                  <p className="text-xs font-body text-muted-foreground">
                    <span className="font-semibold text-card-foreground">Notas detectadas:</span>{" "}
                    {resultadoFinal.range_detected.min_note} – {resultadoFinal.range_detected.max_note}
                  </p>
                )}
                {resultadoFinal.valid_notes?.length > 0 && (
                  <div>
                    <p className="text-xs font-body font-semibold text-card-foreground mb-1">
                      Notas en tu rango:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {resultadoFinal.valid_notes.map((n: string) => (
                        <span key={n} className="text-xs bg-green-500/20 text-green-400 font-mono px-2 py-0.5 rounded-full">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {resultadoFinal.stats?.valid_samples === 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Sostén la nota al menos 0.5s y canta fuerte cerca del micrófono.
                  </p>
                )}
              </div>
            )}
 
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
 
// Frecuencias para mostrar en UI
const NOTE_FREQUENCIES_DISPLAY: Record<string, number> = {
  "E2": 82.41,  "G2": 98.00,  "A2": 110.00,
  "C3": 130.81, "D3": 146.83, "F3": 174.61,
  "G3": 196.00, "A3": 220.00, "B3": 246.94,
  "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23,
  "G4": 392.00, "A4": 440.00, "B4": 493.88,
  "C5": 523.25, "D5": 587.33,
};
 
export default DatasetCollectionScreen;

