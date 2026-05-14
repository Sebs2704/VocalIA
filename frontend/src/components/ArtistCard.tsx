import { useState } from "react";
import { getArtistImage } from "@/lib/artistImages";
import { Play, X } from "lucide-react";

interface Artist {
  name:      string;
  initials:  string;
  sex:       "M" | "F";
  origin:    string;
  genre:     string;
  known_for: string;
  fact:      string;
}

export const ARTISTS: Artist[] = [
  {
    name: "Kevin Kaarl", initials: "KK", sex: "M", origin: "México",
    genre: "Pop / Indie",
    known_for: "Letras melancólicas que mezclan folk y pop contemporáneo.",
    fact: "Su canción 'Amor Viejo' fue un fenómeno viral en Latinoamérica.",
  },
  {
    name: "Melendi", initials: "ML", sex: "M", origin: "España",
    genre: "Pop / Flamenco",
    known_for: "Fusionar flamenco, rock y pop con letras directas y emotivas.",
    fact: "Tiene más de 20 años de carrera consolidada en el pop español.",
  },
  {
    name: "Manuel Medrano", initials: "MM", sex: "M", origin: "Colombia",
    genre: "Pop / Soul",
    known_for: "Voz cálida y letras intimistas con influencia soul.",
    fact: "Ganó el Latin Grammy como Mejor Nuevo Artista en 2016.",
  },
  {
    name: "Alex Ubago", initials: "AU", sex: "M", origin: "España",
    genre: "Pop / Balada",
    known_for: "Baladas románticas con piano como eje central.",
    fact: "Debutó con 'Qué pides tú' y se convirtió en referente de la balada española.",
  },
  {
    name: "Josean Log", initials: "JL", sex: "M", origin: "Puerto Rico",
    genre: "Pop / R&B",
    known_for: "Mezclar pop urbano con emociones profundas y letras introspectivas.",
    fact: "Ha colaborado con artistas de talla latina y reggaeton.",
  },
  {
    name: "Vicente Fernández", initials: "VF", sex: "M", origin: "México",
    genre: "Ranchera / Mariachi",
    known_for: "El rey del mariachi y la música ranchera mexicana.",
    fact: "Conocido como 'El Charro de Huentitán', vendió más de 50 millones de discos.",
  },
  {
    name: "Milo J", initials: "MJ", sex: "M", origin: "Argentina",
    genre: "Trap / Pop urbano",
    known_for: "Representar la nueva generación del trap argentino con melodías suaves.",
    fact: "Con apenas 17 años alcanzó los primeros lugares en plataformas streaming.",
  },
  {
    name: "Jung Kook", initials: "JK", sex: "M", origin: "Corea del Sur",
    genre: "K-Pop / Pop",
    known_for: "Vocalista principal de BTS, con registro vocal excepcional.",
    fact: "Su álbum en solitario 'Golden' debutó #1 en múltiples países.",
  },
  {
    name: "Shawn Mendes", initials: "SM", sex: "M", origin: "Canadá",
    genre: "Pop / Indie Pop",
    known_for: "Baladas pop con guitarra y voz potente y emotiva.",
    fact: "Empezó publicando covers en Vine y llegó al estrellato mundial.",
  },
  {
    name: "Michael Jackson", initials: "MJ", sex: "M", origin: "EE. UU.",
    genre: "Pop / R&B / Funk",
    known_for: "El 'Rey del Pop': voz, baile y producción sin precedentes.",
    fact: "'Thriller' es el álbum más vendido de la historia con +66 millones de copias.",
  },
  {
    name: "Rihanna", initials: "RH", sex: "F", origin: "Barbados",
    genre: "Pop / R&B / Dance",
    known_for: "Reinventarse constantemente fusionando pop, dancehall y R&B.",
    fact: "Es la artista femenina con más singles #1 en la historia de la música.",
  },
  {
    name: "Mitski", initials: "MT", sex: "F", origin: "Japón / EE. UU.",
    genre: "Indie Rock / Art Pop",
    known_for: "Canciones crudas e introspectivas que exploran la identidad y la soledad.",
    fact: "Su álbum 'Puberty 2' fue elegido uno de los mejores del siglo XXI.",
  },
  {
    name: "Lana Del Rey", initials: "LDR", sex: "F", origin: "EE. UU.",
    genre: "Indie Pop / Dream Pop",
    known_for: "Estética cinematográfica y letras nostálgicas sobre el Americana.",
    fact: "'Video Games' se convirtió en un himno de una generación al viralizarse en 2011.",
  },
  {
    name: "Amy Winehouse", initials: "AW", sex: "F", origin: "Reino Unido",
    genre: "Soul / Jazz / R&B",
    known_for: "Voz única que fusionó jazz, soul y R&B con letras autobiográficas.",
    fact: "Ganó 5 Grammy en una sola noche en 2008, un récord para una artista británica.",
  },
  {
    name: "Greeicy", initials: "GC", sex: "F", origin: "Colombia",
    genre: "Pop / Urban",
    known_for: "Combinar pop latino con ritmos urbanos y una voz versátil.",
    fact: "Actriz y cantante, ganó reconocimiento internacional con 'Ganas'.",
  },
  {
    name: "Shakira", initials: "SK", sex: "F", origin: "Colombia",
    genre: "Pop Latino / Rock",
    known_for: "Dominar el pop mundial fusionando ritmos árabes, rock y cumbia.",
    fact: "Es la artista latina con más ventas en la historia: +75 millones de álbumes.",
  },
  {
    name: "Paquita la del Barrio", initials: "PB", sex: "F", origin: "México",
    genre: "Ranchera / Bolero",
    known_for: "Letras irreverentes y empoderadoras en el género ranchero.",
    fact: "Su frase '¿Me estás escuchando, inútil?' es ya parte del folclor mexicano.",
  },
  {
    name: "Laufey", initials: "LF", sex: "F", origin: "Islandia",
    genre: "Jazz / Indie Pop",
    known_for: "Revivir el jazz clásico con un toque pop moderno y etéreo.",
    fact: "Se viralizó en TikTok y ganó el Grammy a Mejor Álbum de Jazz Contemporáneo.",
  },
  {
    name: "Celia Cruz", initials: "CC", sex: "F", origin: "Cuba",
    genre: "Salsa / Son Cubano",
    known_for: "La 'Reina de la Salsa': voz inconfundible y energía desbordante.",
    fact: "Su famoso '¡Azúcar!' se convirtió en un símbolo cultural latinoamericano.",
  },
  {
    name: "Adele", initials: "AD", sex: "F", origin: "Reino Unido",
    genre: "Soul / Pop",
    known_for: "Potencia vocal y baladas que conectan con el dolor y el amor.",
    fact: "'21' fue el álbum más vendido del siglo XXI durante años seguidos.",
  },
];

const ARTIST_VIDEOS: Record<string, { videoId: string; title: string }> = {
  "Kevin Kaarl":           { videoId: "7-Ikexq03O0", title: "San Lucas" },
  "Melendi":               { videoId: "7XPmRUp_Yf4", title: "La Promesa" },
  "Manuel Medrano":        { videoId: "zLX_GcXt2pI", title: "Bajo el agua" },
  "Alex Ubago":            { videoId: "ER9i8WGFgS8", title: "Aunque no te pueda ver" },
  "Josean Log":            { videoId: "ntdwWKaGaPQ", title: "Beso" },
  "Vicente Fernández":     { videoId: "M3CbRJ6jgQc", title: "Millón de primaveras" },
  "Milo J":                { videoId: "MldGX_mbS-o", title: "M.A.I" },
  "Jung Kook":             { videoId: "UNo0TG9LwwI", title: "Standing Next to You" },
  "Shawn Mendes":          { videoId: "lY2yjAdbvdQ", title: "Treat You Better" },
  "Michael Jackson":       { videoId: "Zi_XLOBDo_Y", title: "Billie Jean" },
  "Rihanna":               { videoId: "lWA2pjMjpBs", title: "Diamonds" },
  "Mitski":                { videoId: "3vjkh-acmTE", title: "Washing Machine Heart" },
  "Lana Del Rey":          { videoId: "o_1aF54DO60", title: "Young and Beautiful" },
  "Amy Winehouse":         { videoId: "TJAfLE39ZZ8", title: "Back To Black" },
  "Greeicy":               { videoId: "EedPfUeBf2A", title: "Más Fuerte" },
  "Shakira":               { videoId: "C7ssrLSheg4", title: "Loba" },
  "Paquita la del Barrio": { videoId: "VuyvT9inAf8", title: "Rata De Dos Patas" },
  "Laufey":                { videoId: "obLSGG-oEyw", title: "Lover Girl" },
  "Celia Cruz":            { videoId: "imeXSRNRMeg", title: "La Negra Tiene Tumbao" },
  "Adele":                 { videoId: "rYEDA3JcQqw", title: "Rolling in the Deep" },
};

const THEME = {
  M: {
    bg:          "linear-gradient(145deg, #daeeff 0%, #b8dcff 45%, #8ec4f8 100%)",
    bgSheen:     "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%)",
    text:        "#0a2744",
    textMuted:   "rgba(10,39,68,0.62)",
    textFaint:   "rgba(10,39,68,0.38)",
    badgeBg:     "rgba(10,39,68,0.09)",
    badgeBorder: "rgba(10,39,68,0.20)",
    ring:        "rgba(14,90,180,0.30)",
    photoBg:     "rgba(255,255,255,0.70)",
    shadow:      "0 2px 4px rgba(0,50,120,0.10), 0 8px 20px rgba(0,50,120,0.14), 0 24px 48px rgba(0,50,120,0.12)",
    shadowInner: "inset 0 1px 0 rgba(255,255,255,0.80), inset 0 -1px 0 rgba(0,50,120,0.08)",
    decorator1:  "rgba(255,255,255,0.45)",
    decorator2:  "rgba(142,196,248,0.50)",
    divider:     "rgba(10,39,68,0.10)",
  },
  F: {
    bg:          "linear-gradient(145deg, #ece8ff 0%, #d0c4ff 45%, #b5a4f8 100%)",
    bgSheen:     "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%)",
    text:        "#2a1a5e",
    textMuted:   "rgba(42,26,94,0.62)",
    textFaint:   "rgba(42,26,94,0.38)",
    badgeBg:     "rgba(42,26,94,0.09)",
    badgeBorder: "rgba(42,26,94,0.20)",
    ring:        "rgba(100,60,220,0.30)",
    photoBg:     "rgba(255,255,255,0.70)",
    shadow:      "0 2px 4px rgba(40,0,120,0.10), 0 8px 20px rgba(40,0,120,0.14), 0 24px 48px rgba(40,0,120,0.12)",
    shadowInner: "inset 0 1px 0 rgba(255,255,255,0.80), inset 0 -1px 0 rgba(40,0,120,0.08)",
    decorator1:  "rgba(255,255,255,0.45)",
    decorator2:  "rgba(181,164,248,0.50)",
    divider:     "rgba(42,26,94,0.10)",
  },
} as const;

interface ArtistCardProps {
  artist: Artist;
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  const [expanded,      setExpanded]      = useState(false);
  const [hovered,       setHovered]       = useState(false);
  const [showBack,      setShowBack]      = useState(false);
  const [rotateY,       setRotateY]       = useState(0);
  const [hasTransition, setHasTransition] = useState(true);
  const [flipping,      setFlipping]      = useState(false);

  const photo = getArtistImage(artist.name);
  const T     = THEME[artist.sex];
  const video = ARTIST_VIDEOS[artist.name];

  const cardShadow = `${T.shadow}, ${T.shadowInner}`;
  const cardShadowHover = T.shadow
    .replace("0 2px 4px", "0 4px 8px")
    .replace("0 8px 20px", "0 12px 32px")
    .replace("0 24px 48px", "0 32px 64px") + `, ${T.shadowInner}`;

  const isActive = (expanded || hovered) && !showBack;

  const doFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flipping) return;
    setFlipping(true);
    setHasTransition(true);
    setRotateY(90);

    setTimeout(() => {
      setShowBack(v => !v);
      setExpanded(false);
      setHasTransition(false);
      setRotateY(-90);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHasTransition(true);
          setRotateY(0);
          setTimeout(() => setFlipping(false), 300);
        });
      });
    }, 280);
  };

  const hoverShift = (isActive && rotateY === 0)
    ? "translateY(-5px) rotateX(1.5deg)"
    : "translateY(0px)";

  return (
    <div
      className={`relative w-full select-none rounded-2xl overflow-hidden ${!showBack ? "cursor-pointer" : ""}`}
      style={{
        background:  T.bg,
        boxShadow:   isActive ? cardShadowHover : cardShadow,
        transform:   `perspective(1200px) rotateY(${rotateY}deg) ${hoverShift}`,
        transition:  hasTransition
          ? "box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.23,1,0.32,1)"
          : "box-shadow 0.3s ease",
      }}
      onClick={() => !showBack && setExpanded(v => !v)}
      onMouseEnter={() => !showBack && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Brillo superior */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: T.bgSheen }} />

      {/* Círculos decorativos */}
      <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full pointer-events-none" style={{ background: T.decorator2 }} />
      <div className="absolute -top-5  -left-5  w-20 h-20 rounded-full pointer-events-none" style={{ background: T.decorator1 }} />
      <div className="absolute top-1/2 -right-10 w-16 h-16 rounded-full opacity-40 pointer-events-none" style={{ background: T.decorator2 }} />

      {showBack ? (
        /* ── DORSO: video de YouTube ── */
        <div className="relative z-10 p-3">
          {/* Cabecera */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-heading font-bold text-xs leading-tight truncate" style={{ color: T.text }}>
                {artist.name}
              </p>
              <p className="text-[10px] font-body mt-0.5" style={{ color: T.textMuted }}>
                {video?.title}
              </p>
            </div>
            <button
              onClick={doFlip}
              className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                background: T.badgeBg,
                border:     `1px solid ${T.badgeBorder}`,
                color:      T.text,
              }}
              title="Volver a la tarjeta"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Iframe 16:9 */}
          {video && (
            <div className="rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={`https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                style={{ border: "none", display: "block" }}
              />
            </div>
          )}
        </div>
      ) : (
        /* ── FRENTE: foto + info + expand ── */
        <>
          {/* Botón de video */}
          <button
            onClick={doFlip}
            className="absolute top-2 right-2 z-20 flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-95"
            style={{
              background: T.badgeBg,
              border:     `1px solid ${T.badgeBorder}`,
              color:      T.text,
              boxShadow:  "0 2px 6px rgba(0,0,0,0.12)",
            }}
            title="Ver video"
          >
            <Play className="w-3 h-3" style={{ marginLeft: "1px" }} />
          </button>

          {/* Contenido principal */}
          <div className="relative z-10 flex flex-col items-center p-4 pb-2">
            {/* Nombre */}
            <p
              className="font-heading font-bold text-sm text-center leading-tight drop-shadow-sm w-full mb-3 pr-7"
              style={{ color: T.text }}
            >
              {artist.name}
            </p>

            {/* Foto */}
            <div
              className="rounded-full p-1 mb-3"
              style={{
                background:     T.photoBg,
                boxShadow:      "0 4px 16px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.90)",
                backdropFilter: "blur(8px)",
              }}
            >
              {photo ? (
                <img
                  src={photo}
                  alt={artist.name}
                  className="w-16 h-16 rounded-full object-cover"
                  style={{ outline: `3px solid ${T.ring}`, outlineOffset: "2px" }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-heading font-black"
                  style={{ backgroundColor: T.badgeBg, border: `2px solid ${T.badgeBorder}`, color: T.text }}
                >
                  {artist.initials}
                </div>
              )}
            </div>

            {/* Género */}
            <span
              className="text-xs font-body font-semibold px-3 py-1 rounded-full z-10"
              style={{
                backgroundColor: T.badgeBg,
                color:           T.text,
                border:          `1px solid ${T.badgeBorder}`,
                backdropFilter:  "blur(4px)",
                boxShadow:       "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              {artist.genre}
            </span>

            {/* Hint */}
            <div className="mt-2 text-[10px] font-body" style={{ color: T.textFaint }}>
              {expanded ? "toca para cerrar ↑" : "toca para más ↓"}
            </div>
          </div>

          {/* INFO expandible */}
          <div
            style={{
              maxHeight:  expanded ? "400px" : "0px",
              overflow:   "hidden",
              transition: "max-height 0.45s cubic-bezier(0.23,1,0.32,1)",
            }}
          >
            <div className="mx-4 mb-3" style={{ height: "1px", background: T.divider }} />

            <div className="relative z-10 px-3 pb-4 space-y-2">
              {[
                { label: "Origen",         value: artist.origin    },
                { label: "Conocido/a por", value: artist.known_for },
                { label: "Dato curioso",   value: artist.fact      },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl px-3 py-2"
                  style={{
                    background:     "rgba(255,255,255,0.42)",
                    border:         "1px solid rgba(255,255,255,0.60)",
                    boxShadow:      "0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <span
                    className="text-[9px] font-body uppercase tracking-wider font-semibold"
                    style={{ color: T.textMuted }}
                  >
                    {label}
                  </span>
                  <p
                    className="text-xs font-body leading-snug mt-0.5"
                    style={{ color: T.text }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ArtistCard;
