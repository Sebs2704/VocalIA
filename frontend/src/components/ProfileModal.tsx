import { useState, useRef, useEffect } from "react";
import { X, Camera, User, Save, Loader2, Music } from "lucide-react";
import { apiGetHistory, type VoiceRange } from "@/lib/api";

interface ProfileModalProps {
  username:    string;
  photo:       string | null;
  bio?:        string;
  voiceRange?: VoiceRange | null;
  onSave:      (username: string, photo: string | null, bio: string, voiceRange?: VoiceRange | null, removeVoice?: boolean) => Promise<void>;
  onClose:     () => void;
}

function hzToNoteName(hz: number): string {
  if (hz <= 0) return "—";
  const semitones = Math.round(12 * Math.log2(hz / 440.0));
  const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const midi  = semitones + 69;
  return `${notes[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
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

const fieldStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.45)",
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "inset 0 2px 4px rgba(0,60,100,0.06)",
  color: T.text,
  width: "100%",
  borderRadius: "12px",
  fontSize: "14px",
  fontFamily: "var(--font-body)",
  outline: "none",
};

const ProfileModal = ({ username, photo, bio = "", voiceRange, onSave, onClose }: ProfileModalProps) => {
  const [newUsername,    setNewUsername]    = useState(username);
  const [newBio,         setNewBio]         = useState(bio);
  const [newPhoto,       setNewPhoto]       = useState<string | null>(photo);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Voice range sharing state
  const [shareVoice,     setShareVoice]     = useState(!!voiceRange);
  const [localVoice,     setLocalVoice]     = useState<VoiceRange | null>(voiceRange ?? null);
  const [loadingVoice,   setLoadingVoice]   = useState(false);
  const [voiceFetched,   setVoiceFetched]   = useState(false);

  // Pre-fetch history when we don't yet have data but toggle is about to be useful
  useEffect(() => {
    if (!voiceRange && !voiceFetched) {
      setLoadingVoice(true);
      apiGetHistory()
        .then((history) => {
          if (history.length > 0) {
            const last = history[0];
            setLocalVoice({
              min_freq:  last.min_freq,
              max_freq:  last.max_freq,
              base_freq: last.base_freq,
              min_note:  hzToNoteName(last.min_freq),
              max_note:  hzToNoteName(last.max_freq),
              base_note: hzToNoteName(last.base_freq),
            });
          }
        })
        .catch(() => {})
        .finally(() => { setLoadingVoice(false); setVoiceFetched(true); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("La imagen no puede pesar más de 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setNewPhoto(ev.target?.result as string); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (newUsername.trim().length < 2) { setError("El nombre debe tener al menos 2 caracteres"); return; }
    setSaving(true); setError("");
    try {
      if (shareVoice && localVoice) {
        await onSave(newUsername.trim(), newPhoto, newBio.trim(), localVoice);
      } else if (!shareVoice && voiceRange) {
        // was sharing before, now turning off
        await onSave(newUsername.trim(), newPhoto, newBio.trim(), undefined, true);
      } else {
        await onSave(newUsername.trim(), newPhoto, newBio.trim());
      }
      onClose();
    }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  };

  const btnShadow = `0 3px 0 ${T.btnBot}, 0 6px 20px ${T.shadow}0.35), inset 0 1px 0 rgba(255,255,255,0.16)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-sm overflow-hidden animate-slide-up my-auto"
        style={{
          borderRadius: "24px",
          background: `linear-gradient(160deg, ${T.cardLt} 0%, ${T.card} 100%)`,
          boxShadow: `0 8px 32px ${T.shadow}0.22), 0 32px 80px ${T.shadow}0.18), inset 0 1px 0 rgba(255,255,255,0.55)`,
          border: "1px solid rgba(255,255,255,0.45)",
        }}
      >
        {/* Header teal */}
        <div
          className="relative px-6 pt-8 pb-6 flex flex-col items-center"
          style={{
            background: `linear-gradient(145deg, ${T.dark} 0%, ${T.mid} 55%, ${T.light} 100%)`,
            boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.10)",
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Avatar con hover para cambiar */}
          <div className="relative group mb-3">
            <div
              style={{
                padding: "3px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.25)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.50)",
              }}
            >
              {newPhoto ? (
                <img src={newPhoto} alt="foto de perfil" className="w-20 h-20 rounded-full object-cover" onError={() => setNewPhoto(null)} />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.28)" }}
                >
                  <User className="w-9 h-9 text-white/70" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.42)" }}
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            {newPhoto && (
              <button
                onClick={() => setNewPhoto(null)}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center shadow z-10 transition-transform hover:scale-110"
                style={{ background: "rgba(220,38,38,0.90)", border: "1.5px solid rgba(255,255,255,0.70)" }}
                title="Quitar foto"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          <h2 className="font-heading font-bold text-base text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.22)" }}>
            Editar perfil
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Username */}
          <div>
            <label className="block text-xs font-body font-medium mb-1.5" style={{ color: T.textMd }}>
              Nombre de usuario
            </label>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              maxLength={30}
              style={{ ...fieldStyle, padding: "10px 16px" }}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-body font-medium mb-1.5" style={{ color: T.textMd }}>
              Sobre mí
            </label>
            <textarea
              value={newBio}
              onChange={(e) => setNewBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Cuéntanos algo sobre ti…"
              style={{ ...fieldStyle, padding: "10px 16px", resize: "none" }}
            />
            <p className="text-right text-[10px] font-body mt-0.5" style={{ color: T.textMd }}>
              {newBio.length}/200
            </p>
          </div>

          {/* ── Rango vocal ── */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.55)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4" style={{ color: T.mid }} />
                <span className="text-xs font-body font-medium" style={{ color: T.text }}>
                  Mostrar rango vocal en perfil
                </span>
              </div>
              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setShareVoice((v) => !v)}
                disabled={loadingVoice}
                className="relative w-10 h-5 rounded-full transition-all duration-200 disabled:opacity-50 shrink-0"
                style={{ background: shareVoice ? T.mid : "rgba(0,0,0,0.18)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: shareVoice ? "22px" : "2px" }}
                />
              </button>
            </div>

            {loadingVoice && (
              <div className="flex justify-center py-1">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.mid }} />
              </div>
            )}

            {!loadingVoice && shareVoice && localVoice && (
              <div
                className="rounded-lg px-3 py-2 text-center"
                style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.75)" }}
              >
                <p className="text-xs font-body mb-0.5" style={{ color: T.textMd }}>
                  Tu rango vocal
                </p>
                <p className="text-sm font-heading font-semibold">
                  <span className="text-blue-600">{localVoice.min_note}</span>
                  <span style={{ color: T.textMd }}> → </span>
                  <span className="text-fuchsia-600">{localVoice.max_note}</span>
                  <span style={{ color: T.textMd }}> · cómoda </span>
                  <span className="text-green-600">{localVoice.base_note}</span>
                </p>
                <p className="text-[10px] font-body mt-0.5" style={{ color: T.textMd }}>
                  {Math.round(localVoice.min_freq)} – {Math.round(localVoice.max_freq)} Hz
                </p>
              </div>
            )}

            {!loadingVoice && shareVoice && !localVoice && (
              <p className="text-xs font-body text-center" style={{ color: T.textMd }}>
                No tienes análisis guardados aún. Realiza un análisis vocal primero.
              </p>
            )}

            {!shareVoice && (
              <p className="text-[10px] font-body" style={{ color: T.textMd }}>
                Activa para mostrar tu rango de notas en tu perfil público.
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs font-body px-3 py-2 rounded-xl" style={{ color: "#be123c", background: "rgba(254,205,211,0.55)", border: "1px solid rgba(254,205,211,0.80)" }}>
              {error}
            </p>
          )}

          {/* Guardar */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-heading font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${T.dark} 0%, ${T.mid} 100%)`,
              color: "white",
              boxShadow: btnShadow,
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${T.btnBot}, 0 10px 28px ${T.shadow}0.40), inset 0 1px 0 rgba(255,255,255,0.16)`;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = btnShadow;
            }}
            onMouseDown={(e) => {
              if (!saving) {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 1px 0 ${T.btnBot}, 0 2px 8px ${T.shadow}0.28), inset 0 1px 0 rgba(255,255,255,0.16)`;
              }
            }}
            onMouseUp={(e) => {
              if (!saving) {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${T.btnBot}, 0 10px 28px ${T.shadow}0.40), inset 0 1px 0 rgba(255,255,255,0.16)`;
              }
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
