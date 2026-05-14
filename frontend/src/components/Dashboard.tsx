import { useState, useEffect, useCallback } from "react";
import logoImg from "@/assets/logo.png";
import {
  Music, Mic, Globe, Bell, LogOut, User,
  Sparkles, TrendingUp, Heart,
} from "lucide-react";
import ArtistCard, { ARTISTS } from "./ArtistCard";
import ProfileModal from "./ProfileModal";
import SocialFeed from "./SocialFeed";
import { apiGetNotifications, apiMarkNotifsRead, apiUpdateProfile, type SongResult, type VoiceRange } from "@/lib/api";

interface DashboardProps {
  userId:    string;
  username:  string;
  sex:       string;
  photo:     string | null;
  bio?:      string;
  voiceRange?: VoiceRange | null;
  onLogout:  () => void;
  onAnalyze: () => void;
  onProfileUpdate: (username: string, photo: string | null, bio: string, voiceRange?: VoiceRange | null) => void;
  pendingShareData?: { songs: SongResult[]; minFreq: number; maxFreq: number; baseFreq: number } | null;
  onClearShare?: () => void;
}

type Tab = "inicio" | "analizar" | "social";

const inspirationalQuotes = [
  { text: "La música es el lenguaje universal de la humanidad.", author: "Henry Wadsworth Longfellow" },
  { text: "Donde las palabras fallan, la música habla.", author: "Hans Christian Andersen" },
  { text: "La música expresa lo que no puede decirse y sobre lo que es imposible callar.", author: "Victor Hugo" },
  { text: "Sin música, la vida sería un error.", author: "Friedrich Nietzsche" },
  { text: "La voz es el instrumento más perfecto de todos.", author: "Arvo Pärt" },
];

/* Paleta de teal consistente con hsl(200,...) */
const TEAL = {
  dark:   "hsl(200,55%,22%)",   /* header dark end   #163e52 */
  mid:    "hsl(200,50%,34%)",   /* header light end  #286880 */
  light:  "hsl(200,47%,44%)",   /* accent medium     #3d8caa */
  card:   "hsl(200,40%,72%)",   /* --card color      #9bc1d4 */
  cardLt: "hsl(200,38%,82%)",   /* lighter card      #b8d5e2 */
  text:   "hsl(200,55%,17%)",   /* text on light     #0f3040 */
  textMd: "rgba(15,48,64,0.65)",
  textFt: "rgba(15,48,64,0.38)",
  shadow: "rgba(0,60,100,",
  btnBot: "hsl(200,55%,15%)",   /* button bottom shadow */
};

/* ── Avatar ─────────────────────────────────────────────────────────────────── */
const Avatar = ({ photo, username, size = "sm" }: { photo?: string | null; username: string; size?: "sm" | "md" | "lg" }) => {
  const sz = size === "lg" ? "w-12 h-12" : size === "md" ? "w-9 h-9" : "w-8 h-8";
  if (photo) {
    return (
      <img
        src={photo}
        alt={username}
        className={`${sz} rounded-full object-cover shrink-0`}
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.30)" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center shrink-0`}
      style={{
        background: "rgba(255,255,255,0.22)",
        border: "2px solid rgba(255,255,255,0.42)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <User className="w-4 h-4 text-white/80" />
    </div>
  );
};

/* ── Dashboard ──────────────────────────────────────────────────────────────── */
const Dashboard = ({
  userId, username, photo, bio = "", voiceRange, onLogout, onAnalyze, onProfileUpdate,
  pendingShareData, onClearShare,
}: DashboardProps) => {
  const [activeTab,      setActiveTab]      = useState<Tab>(pendingShareData ? "social" : "inicio");
  const [showProfile,    setShowProfile]    = useState(false);
  const [quoteIndex,     setQuoteIndex]     = useState(0);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifs,         setNotifs]         = useState<Array<{ notif_id: string; type: string; from_username: string; from_photo: string | null; read: boolean; created_at: string }>>([]);

  useEffect(() => {
    const t = setInterval(() => setQuoteIndex((i) => (i + 1) % inspirationalQuotes.length), 8000);
    return () => clearInterval(t);
  }, []);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await apiGetNotifications();
      setUnreadCount(data.unread);
      setNotifs(data.notifications);
    } catch { /* no auth aún */ }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  useEffect(() => {
    if (pendingShareData) setActiveTab("social");
  }, [pendingShareData]);

  const handleOpenNotifs = async () => {
    setShowNotifPanel((v) => !v);
    if (unreadCount > 0) {
      try {
        await apiMarkNotifsRead();
        setUnreadCount(0);
        setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch { /* ignore */ }
    }
  };

  const handleProfileSave = async (
    newUsername: string,
    newPhoto: string | null,
    newBio: string,
    newVoiceRange?: VoiceRange | null,
    removeVoice?: boolean,
  ) => {
    const res = await apiUpdateProfile(newUsername, newPhoto, newBio, newVoiceRange, removeVoice);
    onProfileUpdate(newUsername, newPhoto, newBio, removeVoice ? null : (newVoiceRange ?? res.voice_range ?? undefined));
  };

  const quote = inspirationalQuotes[quoteIndex];
  const tabs: { key: Tab; icon: React.ElementType; label: string }[] = [
    { key: "inicio",   icon: Music,  label: "Inicio"   },
    { key: "analizar", icon: Mic,    label: "Analizar" },
    { key: "social",   icon: Globe,  label: "Social"   },
  ];

  const btnStyle = {
    base: {
      background: `linear-gradient(135deg, ${TEAL.dark} 0%, ${TEAL.mid} 100%)`,
      color: "white",
      boxShadow: `0 3px 0 ${TEAL.btnBot}, 0 6px 20px ${TEAL.shadow}0.35), inset 0 1px 0 rgba(255,255,255,0.16)`,
      textShadow: "0 1px 3px rgba(0,0,0,0.22)",
    },
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(160deg, ${TEAL.cardLt} 0%, ${TEAL.card} 50%, hsl(200,38%,78%) 100%)` }}
    >

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          background: `linear-gradient(90deg, ${TEAL.dark} 0%, ${TEAL.mid} 60%, ${TEAL.light} 100%)`,
          boxShadow: `0 2px 4px ${TEAL.shadow}0.25), 0 8px 24px ${TEAL.shadow}0.18), inset 0 -1px 0 rgba(0,0,0,0.12)`,
        }}
      >
        <div className="container mx-auto flex items-center justify-between px-4 py-3 gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="rounded-xl p-1"
              style={{
                background: "rgba(255,255,255,0.14)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.22)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <img src={logoImg} alt="VocalIA" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-heading font-bold text-base text-white hidden sm:block" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.28)" }}>
              VocalIA
            </span>
          </div>

          {/* Tabs */}
          <nav
            className="flex gap-1 p-1"
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.20)",
              borderRadius: "14px",
            }}
          >
            {tabs.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                title={label}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-medium transition-all duration-200"
                style={activeTab === key ? {
                  background: "rgba(255,255,255,0.92)",
                  color: TEAL.dark,
                  boxShadow: `0 2px 8px ${TEAL.shadow}0.20), inset 0 1px 0 rgba(255,255,255,0.90)`,
                } : {
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </nav>

          {/* Derecha */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                onClick={handleOpenNotifs}
                className="relative p-2 rounded-xl transition-all"
                style={{ color: "rgba(255,255,255,0.82)" }}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span
                    className="absolute top-1 right-1 w-4 h-4 text-[9px] font-heading font-bold rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #ff4d6d, #c9184a)",
                      color: "white",
                      boxShadow: "0 2px 6px rgba(201,24,74,0.50)",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 overflow-hidden z-50"
                  style={{
                    background: `linear-gradient(160deg, ${TEAL.cardLt}, ${TEAL.card})`,
                    borderRadius: "18px",
                    border: "1px solid rgba(255,255,255,0.45)",
                    boxShadow: `0 4px 16px ${TEAL.shadow}0.18), 0 16px 48px ${TEAL.shadow}0.14)`,
                  }}
                >
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.30)", background: "rgba(255,255,255,0.18)" }}
                  >
                    <p className="font-heading font-bold text-sm" style={{ color: TEAL.text }}>Notificaciones</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <p className="text-center text-sm font-body py-6" style={{ color: TEAL.textMd }}>Sin notificaciones</p>
                    ) : notifs.map((n) => (
                      <div
                        key={n.notif_id}
                        className="flex items-start gap-3 px-4 py-3"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.20)",
                          background: !n.read ? "rgba(255,255,255,0.12)" : "transparent",
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "rgba(255,255,255,0.35)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.60)" }}
                        >
                          <User className="w-3.5 h-3.5" style={{ color: TEAL.text }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-body" style={{ color: TEAL.text }}>
                            <span className="font-semibold">{n.from_username}</span>{" "}
                            {n.type === "follow" ? "empezó a seguirte" : n.type === "like" ? "le dio me gusta a tu publicación" : n.type === "comment" ? "comentó tu publicación" : "publicó algo nuevo"}
                          </p>
                          <p className="text-[10px] font-body mt-0.5" style={{ color: TEAL.textFt }}>
                            {new Date(n.created_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: TEAL.mid }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowProfile(true)}
              className="rounded-full transition-all hover:scale-105"
              title="Editar perfil"
            >
              <Avatar photo={photo} username={username} size="sm" />
            </button>
            <span className="text-sm font-body hidden lg:block truncate max-w-[100px]" style={{ color: "rgba(255,255,255,0.82)" }}>
              {username}
            </span>
            <button onClick={onLogout} className="p-2 rounded-xl transition-all" title="Salir" style={{ color: "rgba(255,255,255,0.75)" }}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO ────────────────────────────────────────────────────── */}
      <main className="flex-1 container mx-auto px-4 py-6">

        {/* ======= INICIO ======= */}
        {activeTab === "inicio" && (
          <div className="space-y-8 animate-fade-in">

            {/* Frase inspiradora */}
            <div
              className="relative rounded-3xl p-8 overflow-hidden text-center"
              style={{
                background: `linear-gradient(145deg, ${TEAL.dark} 0%, ${TEAL.mid} 55%, ${TEAL.light} 100%)`,
                boxShadow: `0 4px 8px ${TEAL.shadow}0.22), 0 16px 48px ${TEAL.shadow}0.18), 0 40px 80px ${TEAL.shadow}0.12), inset 0 1px 0 rgba(255,255,255,0.10)`,
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div className="absolute top-4 right-4 opacity-10"><Music className="w-20 h-20 text-white" /></div>
              <div className="absolute bottom-4 left-4 opacity-10"><Mic className="w-16 h-16 text-white" /></div>
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle, rgba(200,230,255,1), transparent)" }} />
              <Heart className="w-7 h-7 mx-auto mb-3 animate-pulse-glow" style={{ color: `${TEAL.cardLt}` }} />
              <blockquote className="text-lg md:text-xl font-heading font-bold text-white mb-2 transition-all duration-500" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.28)" }}>
                "{quote.text}"
              </blockquote>
              <p className="text-xs font-body italic" style={{ color: "rgba(255,255,255,0.62)" }}>— {quote.author}</p>
            </div>

            {/* Cards informativas */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: Mic,        title: "Tu Voz es Única",  text: "Cada persona tiene frecuencias vocales únicas. Descúbrelas con VocalIA."  },
                { icon: TrendingUp, title: "Mejora Constante", text: "Con práctica puedes expandir tu rango de frecuencias vocales progresivamente." },
                { icon: Sparkles,   title: "IA Musical",       text: "Nuestro modelo analiza tus frecuencias y recomienda las canciones más compatibles." },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="group rounded-2xl p-5 cursor-default"
                  style={{
                    background: `linear-gradient(145deg, ${TEAL.cardLt} 0%, ${TEAL.card} 55%, hsl(200,42%,65%) 100%)`,
                    boxShadow: `0 2px 4px ${TEAL.shadow}0.12), 0 8px 24px ${TEAL.shadow}0.14), 0 24px 56px ${TEAL.shadow}0.10), inset 0 1px 0 rgba(255,255,255,0.82)`,
                    border: "1px solid rgba(255,255,255,0.68)",
                    transition: "all 0.3s cubic-bezier(0.23,1,0.32,1)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 8px ${TEAL.shadow}0.15), 0 16px 40px ${TEAL.shadow}0.18), 0 40px 80px ${TEAL.shadow}0.12), inset 0 1px 0 rgba(255,255,255,0.88)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 4px ${TEAL.shadow}0.12), 0 8px 24px ${TEAL.shadow}0.14), 0 24px 56px ${TEAL.shadow}0.10), inset 0 1px 0 rgba(255,255,255,0.82)`;
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background: "rgba(255,255,255,0.45)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70), 0 2px 8px rgba(0,60,100,0.10)",
                      border: "1px solid rgba(255,255,255,0.55)",
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: TEAL.mid }} />
                  </div>
                  <h3 className="text-base font-heading font-bold mb-1" style={{ color: TEAL.text }}>{title}</h3>
                  <p className="text-xs font-body leading-relaxed" style={{ color: TEAL.textMd }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Artistas */}
            <div>
              <h2 className="text-xl font-heading font-bold mb-1 text-center" style={{ color: TEAL.text }}>Nuestros artistas</h2>
              <p className="font-body text-xs mb-5 text-center" style={{ color: TEAL.textMd }}>Toca una tarjeta para conocer más sobre el artista.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {ARTISTS.map((a) => <ArtistCard key={a.name} artist={a} />)}
              </div>
            </div>
          </div>
        )}

        {/* ======= ANALIZAR ======= */}
        {activeTab === "analizar" && (
          <div className="animate-fade-in max-w-lg mx-auto">
            <div
              className="rounded-3xl p-8 text-center space-y-6"
              style={{
                background: `linear-gradient(145deg, ${TEAL.cardLt} 0%, ${TEAL.card} 55%, hsl(200,42%,66%) 100%)`,
                boxShadow: `0 4px 8px ${TEAL.shadow}0.14), 0 16px 48px ${TEAL.shadow}0.16), 0 40px 80px ${TEAL.shadow}0.10), inset 0 1px 0 rgba(255,255,255,0.86)`,
                border: "1px solid rgba(255,255,255,0.72)",
              }}
            >
              <Mic className="w-14 h-14 mx-auto animate-pulse-glow" style={{ color: TEAL.mid }} />
              <div>
                <h2 className="text-2xl font-heading font-bold mb-2" style={{ color: TEAL.text }}>A explorar tu voz</h2>
                <p className="font-body text-sm leading-relaxed" style={{ color: TEAL.textMd }}>
                  Nuestra IA detectará tus frecuencias vocales y determinará el{" "}
                  <strong style={{ color: TEAL.text }}>top 3 de canciones</strong> que mejor se adaptan a tu voz.
                </p>
              </div>

              <div
                className="rounded-xl p-4 text-left space-y-2"
                style={{
                  background: "rgba(255,255,255,0.48)",
                  border: "1px solid rgba(255,255,255,0.72)",
                  boxShadow: "inset 0 2px 4px rgba(0,60,100,0.06), 0 1px 0 rgba(255,255,255,0.80)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <h4 className="font-heading font-bold text-sm" style={{ color: TEAL.text }}>¿Cómo funciona?</h4>
                <ol className="text-xs font-body space-y-1.5 list-decimal list-inside" style={{ color: TEAL.textMd }}>
                  <li>Graba tu nota más baja que puedas sostener cómodamente.</li>
                  <li>Graba tu nota más alta que puedas alcanzar.</li>
                  <li>Habla una frase corta con tu voz natural.</li>
                  <li>La IA analiza tus frecuencias y te recomienda las 3 canciones más compatibles.</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={onAnalyze}
                className="w-full py-4 rounded-xl font-heading font-semibold text-base flex items-center justify-center gap-2 transition-all"
                style={btnStyle.base}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${TEAL.btnBot}, 0 10px 28px ${TEAL.shadow}0.40), inset 0 1px 0 rgba(255,255,255,0.16)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = btnStyle.base.boxShadow;
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 1px 0 ${TEAL.btnBot}, 0 2px 8px ${TEAL.shadow}0.28), inset 0 1px 0 rgba(255,255,255,0.16)`;
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${TEAL.btnBot}, 0 10px 28px ${TEAL.shadow}0.40), inset 0 1px 0 rgba(255,255,255,0.16)`;
                }}
              >
                <Mic className="w-5 h-5" />
                Analizar mi voz ahora
              </button>
              <p className="text-xs font-body" style={{ color: TEAL.textFt }}>El análisis completo toma menos de 2 minutos</p>
            </div>
          </div>
        )}

        {/* ======= SOCIAL ======= */}
        {activeTab === "social" && (
          <div className="animate-fade-in">
            <SocialFeed
              currentUserId={userId}
              currentUsername={username}
              currentUserPhoto={photo}
              pendingShareData={pendingShareData}
              onClearShare={onClearShare}
            />
          </div>
        )}
      </main>

      {showNotifPanel && <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />}

      {showProfile && (
        <ProfileModal
          username={username}
          photo={photo}
          bio={bio}
          voiceRange={voiceRange}
          onSave={handleProfileSave}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
