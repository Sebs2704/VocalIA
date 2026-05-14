import { useState, useEffect, useCallback } from "react";
import { Heart, Send, UserPlus, UserCheck, Search, Music2, Image, X, Loader2, User, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  apiGetFeed, apiCreatePost, apiToggleLike, apiGetUsers,
  apiFollowUser, apiUnfollowUser, apiGetProfile, apiGetTopSongs, apiGetRecommendations,
  apiGetComments, apiAddComment,
  type Post, type UserSummary, type SongResult, type UserProfile, type Comment,
} from "@/lib/api";
import { getArtistImage, extractArtist } from "@/lib/artistImages";

interface SocialFeedProps {
  currentUserId:    string;
  currentUsername:  string;
  currentUserPhoto: string | null;
  pendingShareData?: { songs: SongResult[]; minFreq: number; maxFreq: number; baseFreq: number } | null;
  onClearShare?: () => void;
}

/* ── Avatar helper ─────────────────────────────────────────────────────────── */
const Avatar = ({ photo, username, size = "sm" }: { photo?: string | null; username: string; size?: "sm" | "md" | "lg" }) => {
  const sz = size === "lg" ? "w-16 h-16" : size === "md" ? "w-9 h-9" : "w-8 h-8";
  if (photo) {
    return <img src={photo} alt={username} className={`${sz} rounded-full object-cover ring-2 ring-primary/20 shrink-0`} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <div className={`${sz} rounded-full bg-primary/20 flex items-center justify-center shrink-0`}>
      <User className="w-4 h-4 text-primary/60" />
    </div>
  );
};

/* ── Timestamp helper ──────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const utc = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  const diff = Date.now() - new Date(utc).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* ── SongList (shared between PostCard and ProfilePostCard) ────────────────── */
const SongList = ({ songs }: { songs: SongResult[] }) => (
  <div
    className="rounded-xl p-3 space-y-2"
    style={{ background: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 2px 8px rgba(0,60,100,0.06)" }}
  >
    <p className="text-xs font-body text-muted-foreground font-semibold tracking-wide uppercase">Top canciones compatibles</p>
    {songs.map((s, i) => {
      const idx    = s.nombre.lastIndexOf(" - ");
      const title  = idx >= 0 ? s.nombre.slice(0, idx).trim()  : s.nombre;
      const artist = idx >= 0 ? s.nombre.slice(idx + 3).trim() : "";
      const img    = getArtistImage(s.nombre);
      return (
        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.90)", boxShadow: "0 2px 8px rgba(0,50,120,0.07), inset 0 1px 0 rgba(255,255,255,0.90)" }}
        >
          <span className="text-primary font-heading font-bold text-sm w-4 shrink-0">{i + 1}</span>
          {img ? (
            <img src={img} alt={artist} className="w-8 h-8 rounded-full object-cover shrink-0" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Music2 className="w-4 h-4 text-primary/50" /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body font-medium text-foreground truncate">{title}</p>
            <p className="text-xs text-primary/70 font-body truncate">{artist}</p>
          </div>
          <span className={`text-xs font-heading font-bold shrink-0 ${s.compatibilidad >= 70 ? "text-green-500" : s.compatibilidad >= 40 ? "text-yellow-500" : "text-red-400"}`}>
            {s.compatibilidad}%
          </span>
        </div>
      );
    })}
  </div>
);

/* ── CommentSection ────────────────────────────────────────────────────────── */
const CommentSection = ({
  postId, currentUserPhoto, currentUsername,
}: {
  postId:           string;
  currentUserPhoto: string | null;
  currentUsername:  string;
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [text,     setText]     = useState("");
  const [posting,  setPosting]  = useState(false);

  useEffect(() => {
    apiGetComments(postId)
      .then((d) => setComments(d.comments))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [postId]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const c = await apiAddComment(postId, text.trim());
      setComments((prev) => [...prev, c]);
      setText("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al comentar");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="border-t border-white/40 pt-3 space-y-2 mt-1">
      {!loaded ? (
        <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 font-body text-center py-1">Sin comentarios aún. ¡Sé el primero!</p>
      ) : (
        comments.map((c) => (
          <div key={c.comment_id} className="flex gap-2 items-start">
            <Avatar photo={c.user_photo} username={c.username} size="sm" />
            <div className="flex-1 rounded-xl px-3 py-1.5" style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.75)" }}>
              <p className="text-xs font-heading font-semibold text-foreground">{c.username}</p>
              <p className="text-xs font-body text-foreground/80 leading-relaxed">{c.content}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/55 font-body mt-1 shrink-0">{timeAgo(c.created_at)}</span>
          </div>
        ))
      )}
      {/* Input */}
      <div className="flex gap-2 items-center mt-1">
        <Avatar photo={currentUserPhoto} username={currentUsername} size="sm" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !posting) handleSubmit(); }}
          placeholder="Escribe un comentario…"
          maxLength={300}
          className="flex-1 rounded-xl px-3 py-1.5 text-xs font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ background: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.65)" }}
        />
        <button
          onClick={handleSubmit}
          disabled={posting || !text.trim()}
          className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50 transition-colors shrink-0"
        >
          {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};

/* ── PostCard ──────────────────────────────────────────────────────────────── */
const PostCard = ({
  post, currentUserId, currentUserPhoto, currentUsername, onLike, onViewProfile,
}: {
  post:             Post;
  currentUserId:    string;
  currentUserPhoto: string | null;
  currentUsername:  string;
  onLike:           (id: string) => void;
  onViewProfile:    (userId: string) => void;
}) => {
  const [showComments, setShowComments] = useState(false);
  const songs: SongResult[] = post.analysis_data?.songs ?? [];

  return (
    <div
      className="rounded-2xl p-4 space-y-3 card-3d"
      style={{
        background: "linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(235,244,255,0.92) 100%)",
        border: "1px solid rgba(255,255,255,0.80)",
      }}
    >
      {/* Header usuario */}
      <div className="flex items-center gap-3">
        <button onClick={() => onViewProfile(post.user_id)} className="shrink-0 hover:scale-105 transition-transform">
          <Avatar photo={post.user_photo} username={post.username} size="md" />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => onViewProfile(post.user_id)} className="hover:underline text-left">
            <p className="font-heading font-semibold text-sm text-foreground">{post.username}</p>
          </button>
          <p className="text-muted-foreground/60 text-xs font-body">{timeAgo(post.created_at)}</p>
        </div>
        {post.post_type === "analysis_share" && (
          <span
            className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-body font-semibold"
            style={{ background: "rgba(255,255,255,0.45)", color: "hsl(200,50%,30%)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "0 1px 4px rgba(0,60,100,0.10), inset 0 1px 0 rgba(255,255,255,0.70)" }}
          >
            <Music2 className="w-3 h-3" /> análisis vocal
          </span>
        )}
      </div>

      {post.content && <p className="text-sm text-foreground/90 font-body leading-relaxed">{post.content}</p>}

      {post.image_url && (
        <img src={post.image_url} alt="post" className="w-full rounded-xl object-cover max-h-72 shadow-md" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}

      {post.post_type === "analysis_share" && songs.length > 0 && <SongList songs={songs} />}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1 border-t border-white/60">
        <button
          onClick={() => onLike(post.post_id)}
          className={`flex items-center gap-1.5 text-sm font-body transition-all mt-1 ${post.liked_by_me ? "text-red-400 scale-110" : "text-muted-foreground hover:text-red-400 hover:scale-110"}`}
        >
          <Heart className={`w-4 h-4 ${post.liked_by_me ? "fill-red-400" : ""}`} />
          {post.likes.length > 0 && <span>{post.likes.length}</span>}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-primary transition-colors mt-1"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs">Responder</span>
        </button>
      </div>

      {showComments && (
        <CommentSection
          postId={post.post_id}
          currentUserPhoto={currentUserPhoto}
          currentUsername={currentUsername}
        />
      )}
    </div>
  );
};

/* ── ProfilePostCard ───────────────────────────────────────────────────────── */
const ProfilePostCard = ({
  post, currentUserId, currentUserPhoto, currentUsername, onLike,
}: {
  post:             import("@/lib/api").ProfilePost;
  currentUserId:    string;
  currentUserPhoto: string | null;
  currentUsername:  string;
  onLike:           (postId: string, currentlyLiked: boolean) => void;
}) => {
  const [likeCount,  setLikeCount]  = useState(post.likes);
  const [likedByMe,  setLikedByMe]  = useState(post.liked_by_me);
  const [showComments, setShowComments] = useState(false);
  const songs: SongResult[] = (post.analysis_data?.songs as SongResult[]) ?? [];

  const handleLike = () => {
    const wasLiked = likedByMe;
    setLikedByMe(!wasLiked);
    setLikeCount((n) => n + (wasLiked ? -1 : 1));
    onLike(post.post_id, wasLiked);
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "linear-gradient(160deg, rgba(255,255,255,0.96) 0%, rgba(235,244,255,0.92) 100%)",
        border: "1px solid rgba(255,255,255,0.80)",
        boxShadow: "0 2px 4px rgba(0,60,100,0.06), 0 8px 24px rgba(0,60,100,0.08), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      {post.post_type === "analysis_share" && (
        <span
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-body font-semibold w-fit"
          style={{ background: "rgba(255,255,255,0.45)", color: "hsl(200,50%,30%)", border: "1px solid rgba(255,255,255,0.65)" }}
        >
          <Music2 className="w-3 h-3" /> análisis vocal
        </span>
      )}
      {post.content && <p className="text-sm text-foreground/90 font-body leading-relaxed">{post.content}</p>}
      {post.post_type === "analysis_share" && songs.length > 0 && <SongList songs={songs} />}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1 border-t border-white/60">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm font-body transition-all mt-1 ${likedByMe ? "text-red-400 scale-110" : "text-muted-foreground hover:text-red-400 hover:scale-110"}`}
        >
          <Heart className={`w-4 h-4 ${likedByMe ? "fill-red-400" : ""}`} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-body text-muted-foreground hover:text-primary transition-colors mt-1"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs">Responder</span>
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground/60 font-body">{timeAgo(post.created_at)}</span>
      </div>

      {showComments && (
        <CommentSection
          postId={post.post_id}
          currentUserPhoto={currentUserPhoto}
          currentUsername={currentUsername}
        />
      )}
    </div>
  );
};

/* ── UserProfilePage ───────────────────────────────────────────────────────── */
const UserProfilePage = ({
  userId, currentUserId, currentUserPhoto, currentUsername, onBack, onFollowChanged, onViewProfile,
}: {
  userId:           string;
  currentUserId:    string;
  currentUserPhoto: string | null;
  currentUsername:  string;
  onBack:           () => void;
  onFollowChanged:  () => void;
  onViewProfile:    (id: string) => void;
}) => {
  const [profile,       setProfile]       = useState<UserProfile | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [following,     setFollowing]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGetProfile(userId)
      .then((data) => { setProfile(data); setFollowing(data.is_following); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      if (following) {
        await apiUnfollowUser(userId);
        setFollowing(false);
        setProfile((p) => p ? { ...p, followers: p.followers - 1 } : p);
      } else {
        await apiFollowUser(userId);
        setFollowing(true);
        setProfile((p) => p ? { ...p, followers: p.followers + 1 } : p);
      }
      onFollowChanged();
    } catch { /* ignore */ } finally {
      setActionLoading(false);
    }
  };

  const handleLike = async (postId: string, wasLiked: boolean) => {
    try {
      await apiToggleLike(postId);
    } catch {
      // revert optimistic update — reload profile
      apiGetProfile(userId).then((data) => setProfile(data)).catch(() => {});
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">

      {/* ── Columna principal ── */}
      <div className="space-y-5">

        {/* Botón volver */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-body font-medium transition-colors hover:opacity-80"
          style={{ color: "hsl(200,55%,28%)" }}
        >
          <span className="text-base">←</span> Volver al feed
        </button>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : !profile ? (
          <div className="text-center py-14 text-muted-foreground font-body text-sm">No se pudo cargar el perfil.</div>
        ) : (
          <>
            {/* ── Tarjeta de perfil ── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                boxShadow: "0 4px 8px rgba(0,60,100,0.12), 0 16px 40px rgba(0,60,100,0.14), inset 0 1px 0 rgba(255,255,255,0.72)",
                border: "1px solid rgba(255,255,255,0.55)",
              }}
            >
              <div
                className="px-6 pt-10 pb-8 flex flex-col items-center text-center"
                style={{ background: "linear-gradient(145deg, hsl(200,55%,22%) 0%, hsl(200,50%,34%) 55%, hsl(200,47%,44%) 100%)" }}
              >
                {/* Avatar grande */}
                <div
                  className="mb-4"
                  style={{ padding: "4px", borderRadius: "50%", background: "rgba(255,255,255,0.30)", boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}
                >
                  {profile.photo ? (
                    <img src={profile.photo} alt={profile.username}
                      className="w-28 h-28 rounded-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="w-12 h-12 text-white/70" />
                    </div>
                  )}
                </div>

                <h2 className="font-heading font-bold text-2xl text-white drop-shadow mb-1">{profile.username}</h2>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-white/75 font-body text-xs max-w-xs mt-1 mb-2 leading-relaxed">{profile.bio}</p>
                )}

                {/* Rango vocal */}
                {profile.voice_range && (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full mt-1 mb-2"
                    style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)" }}
                  >
                    <Music2 className="w-3 h-3 text-white/70" />
                    <span className="text-xs font-body text-white/90">
                      <span className="text-blue-200 font-semibold">{profile.voice_range.min_note}</span>
                      {" → "}
                      <span className="text-fuchsia-200 font-semibold">{profile.voice_range.max_note}</span>
                      {" · cómoda "}
                      <span className="text-green-200 font-semibold">{profile.voice_range.base_note}</span>
                    </span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-4 mt-3">
                  {[
                    { label: "publicaciones", value: profile.posts_count },
                    { label: "seguidores",    value: profile.followers   },
                    { label: "siguiendo",     value: profile.following   },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center px-4 py-2 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)" }}>
                      <p className="font-heading font-bold text-lg text-white">{value}</p>
                      <p className="text-white/70 text-[10px] font-body">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Seguir / Siguiendo */}
                {userId !== currentUserId && (
                  <button
                    onClick={handleFollow}
                    disabled={actionLoading}
                    className="flex items-center gap-2 text-sm font-body font-semibold px-8 py-2.5 rounded-xl mt-4 transition-all disabled:opacity-50"
                    style={following ? {
                      background: "rgba(255,255,255,0.18)",
                      color: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(255,255,255,0.28)",
                    } : {
                      background: "rgba(255,255,255,0.92)",
                      color: "hsl(200,55%,22%)",
                      boxShadow: "0 2px 8px rgba(0,60,100,0.18)",
                    }}
                  >
                    {actionLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : following
                        ? <><UserCheck className="w-4 h-4" /> Siguiendo</>
                        : <><UserPlus className="w-4 h-4" /> Seguir</>
                    }
                  </button>
                )}
              </div>
            </div>

            {/* ── Publicaciones ── */}
            <div>
              <h3 className="font-heading font-bold text-base mb-3" style={{ color: "hsl(200,55%,22%)" }}>
                Publicaciones
              </h3>
              {profile.posts.length === 0 ? (
                <div className="text-center py-12">
                  <Music2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground font-body text-sm">Sin publicaciones aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.posts.map((p) => (
                    <ProfilePostCard
                      key={p.post_id}
                      post={p}
                      currentUserId={currentUserId}
                      currentUserPhoto={currentUserPhoto}
                      currentUsername={currentUsername}
                      onLike={handleLike}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Sidebar: a quién seguir ── */}
      <aside className="hidden lg:block sticky top-24">
        <RecommendationsWidget
          currentUserId={currentUserId}
          onFollowChanged={onFollowChanged}
          onViewProfile={onViewProfile}
        />
      </aside>
    </div>
  );
};

/* ── CreatePost ────────────────────────────────────────────────────────────── */
const CreatePost = ({
  currentUserPhoto, currentUsername, prefillSongs, onPosted, onCancelShare,
}: {
  currentUserPhoto: string | null;
  currentUsername:  string;
  prefillSongs?:    SongResult[] | null;
  onPosted:         () => void;
  onCancelShare:    () => void;
}) => {
  const [text,     setText]     = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImg,  setShowImg]  = useState(false);
  const [posting,  setPosting]  = useState(false);

  const isShare = !!prefillSongs?.length;

  const handlePost = async () => {
    if (!text.trim() && !isShare) return;
    setPosting(true);
    try {
      await apiCreatePost({
        content:       text.trim() || (isShare ? "¡Compartiendo mis resultados de análisis vocal! 🎤" : ""),
        image_url:     imageUrl.trim() || undefined,
        post_type:     isShare ? "analysis_share" : "post",
        analysis_data: isShare ? { songs: prefillSongs } : undefined,
      });
      setText(""); setImageUrl(""); setShowImg(false);
      onPosted();
      if (isShare) onCancelShare();
    } finally { setPosting(false); }
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "hsl(var(--card))",
        boxShadow: "0 2px 4px rgba(0,60,100,0.12), 0 8px 24px rgba(0,60,100,0.14), 0 24px 56px rgba(0,60,100,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
        border: "1px solid rgba(255,255,255,0.55)",
      }}
    >
      <div className="flex gap-3">
        <Avatar photo={currentUserPhoto} username={currentUsername} size="md" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isShare ? "Añade un comentario sobre tu análisis..." : "¿Qué quieres compartir?"}
          rows={2}
          maxLength={500}
          className="flex-1 bg-secondary/40 border border-border rounded-xl px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {isShare && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
          <Music2 className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-primary font-body flex-1">Compartiendo tu top 3 de canciones compatibles</p>
          <button onClick={onCancelShare} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
        </div>
      )}
      {showImg && (
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="URL de imagen (opcional)..."
          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowImg((v) => !v)}
          className={`flex items-center gap-1 text-xs font-body px-2 py-1 rounded-lg transition-colors ${showImg ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Image className="w-3.5 h-3.5" /> Imagen
        </button>
        <button
          onClick={handlePost}
          disabled={posting || (!text.trim() && !isShare)}
          className="flex items-center gap-1.5 text-xs font-heading font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Publicar
        </button>
      </div>
    </div>
  );
};

/* ── UsersPanel ────────────────────────────────────────────────────────────── */
const UsersPanel = ({
  currentUserId, onFollowChanged, onViewProfile,
}: {
  currentUserId:   string;
  onFollowChanged: () => void;
  onViewProfile:   (userId: string) => void;
}) => {
  const [query,   setQuery]   = useState("");
  const [users,   setUsers]   = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try { const data = await apiGetUsers(q); setUsers(data.users); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { search(""); }, [search]);

  const handleFollow = async (u: UserSummary) => {
    try {
      if (u.is_following) { await apiUnfollowUser(u.user_id); }
      else                { await apiFollowUser(u.user_id);   }
      setUsers((prev) => prev.map((x) => x.user_id === u.user_id ? { ...x, is_following: !x.is_following } : x));
      onFollowChanged();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          placeholder="Buscar usuarios..."
          className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ background: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.65)", boxShadow: "inset 0 2px 4px rgba(0,60,100,0.06)" }}
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {users.filter((u) => u.user_id !== currentUserId).map((u) => (
            <div
              key={u.user_id}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.38)",
                border: "1px solid rgba(255,255,255,0.60)",
                boxShadow: "0 2px 8px rgba(0,60,100,0.08), inset 0 1px 0 rgba(255,255,255,0.75)",
              }}
            >
              <button onClick={() => onViewProfile(u.user_id)} className="hover:opacity-80 transition-opacity shrink-0">
                <Avatar photo={u.photo} username={u.username} size="md" />
              </button>
              <button onClick={() => onViewProfile(u.user_id)} className="flex-1 min-w-0 text-left hover:underline">
                <p className="text-sm font-heading font-medium text-foreground truncate">{u.username}</p>
              </button>
              <button
                onClick={() => handleFollow(u)}
                className={`flex items-center gap-1 text-xs font-body px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
                  u.is_following
                    ? "bg-secondary text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                    : "bg-primary/20 text-primary hover:bg-primary/30"
                }`}
              >
                {u.is_following ? <><UserCheck className="w-3.5 h-3.5" /> Siguiendo</> : <><UserPlus className="w-3.5 h-3.5" /> Seguir</>}
              </button>
            </div>
          ))}
          {users.length === 0 && !loading && (
            <p className="text-center text-muted-foreground text-sm font-body py-6">No se encontraron usuarios</p>
          )}
        </div>
      )}
    </div>
  );
};

/* ── TopSongsWidget ────────────────────────────────────────────────────────── */
const TopSongsWidget = () => {
  const [songs,   setSongs]   = useState<{ nombre: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetTopSongs()
      .then((d) => setSongs(d.top_songs))
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="rounded-2xl p-4 space-y-3 sticky top-24"
      style={{
        background: "hsl(var(--card))",
        boxShadow: "0 2px 4px rgba(0,60,100,0.12), 0 8px 24px rgba(0,60,100,0.14), 0 24px 56px rgba(0,60,100,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
        border: "1px solid rgba(255,255,255,0.55)",
      }}
    >
      <div className="flex items-center gap-2">
        <Music2 className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-bold text-sm text-foreground">Top Canciones</h3>
      </div>
      <p className="text-[10px] text-muted-foreground font-body leading-snug">
        Las más recomendadas entre todos los usuarios
      </p>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
      ) : songs.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body text-center py-2">Sin datos aún</p>
      ) : (
        <div className="space-y-3">
          {songs.map((s, i) => {
            const artistName = extractArtist(s.nombre);
            const idx        = s.nombre.lastIndexOf(" - ");
            const songTitle  = idx >= 0 ? s.nombre.slice(0, idx).trim() : s.nombre;
            const img        = getArtistImage(s.nombre);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-primary font-heading font-bold text-sm w-4 shrink-0">{i + 1}</span>
                {img ? (
                  <img src={img} alt={artistName} className="w-8 h-8 rounded-full object-cover ring-1 ring-primary/20 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Music2 className="w-4 h-4 text-primary/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body font-medium text-foreground truncate">{songTitle}</p>
                  <p className="text-[10px] text-primary/70 font-body truncate">{artistName}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-body">{s.count} {s.count === 1 ? "vez" : "veces"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── RecommendationsWidget ─────────────────────────────────────────────────── */
const RecommendationsWidget = ({
  currentUserId, onFollowChanged, onViewProfile,
}: {
  currentUserId:   string;
  onFollowChanged: () => void;
  onViewProfile:   (userId: string) => void;
}) => {
  const [users,   setUsers]   = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const d = await apiGetRecommendations(); setUsers(d.recommendations); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFollow = async (u: UserSummary) => {
    try {
      await apiFollowUser(u.user_id);
      setUsers((prev) => prev.filter((x) => x.user_id !== u.user_id));
      onFollowChanged();
    } catch { /* ignore */ }
  };

  if (!loading && users.filter((u) => u.user_id !== currentUserId).length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4 space-y-3 sticky top-24"
      style={{
        background: "hsl(var(--card))",
        boxShadow: "0 2px 4px rgba(0,60,100,0.12), 0 8px 24px rgba(0,60,100,0.14), 0 24px 56px rgba(0,60,100,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
        border: "1px solid rgba(255,255,255,0.55)",
      }}
    >
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-bold text-sm text-foreground">Sugerencias</h3>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {users.filter((u) => u.user_id !== currentUserId).map((u) => (
            <div key={u.user_id} className="flex items-center gap-2">
              <button onClick={() => onViewProfile(u.user_id)} className="hover:opacity-80 transition-opacity shrink-0">
                <Avatar photo={u.photo} username={u.username} size="sm" />
              </button>
              <button onClick={() => onViewProfile(u.user_id)} className="flex-1 min-w-0 text-left hover:underline">
                <p className="text-xs font-heading font-medium text-foreground truncate">{u.username}</p>
              </button>
              <button
                onClick={() => handleFollow(u)}
                className="flex items-center gap-1 text-[10px] font-body bg-primary/20 text-primary hover:bg-primary/30 px-2 py-1 rounded-lg transition-colors shrink-0"
              >
                <UserPlus className="w-3 h-3" /> Seguir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── SocialFeed principal ──────────────────────────────────────────────────── */
type SocialTab = "feed" | "people";

const SocialFeed = ({ currentUserId, currentUsername, currentUserPhoto, pendingShareData, onClearShare }: SocialFeedProps) => {
  const [tab,           setTab]           = useState<SocialTab>("feed");
  const [posts,         setPosts]         = useState<Post[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try { const data = await apiGetFeed(); setPosts(data.posts); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const handleLike = async (postId: string) => {
    await apiToggleLike(postId);
    setPosts((prev) => prev.map((p) =>
      p.post_id !== postId ? p : {
        ...p,
        liked_by_me: !p.liked_by_me,
        likes: p.liked_by_me
          ? p.likes.filter((id) => id !== currentUserId)
          : [...p.likes, currentUserId],
      }
    ));
  };

  if (viewProfileId) {
    return (
      <div className="max-w-5xl mx-auto">
        <UserProfilePage
          userId={viewProfileId}
          currentUserId={currentUserId}
          currentUserPhoto={currentUserPhoto}
          currentUsername={currentUsername}
          onBack={() => setViewProfileId(null)}
          onFollowChanged={fetchFeed}
          onViewProfile={setViewProfileId}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-6 items-start">

        {/* ── Panel izquierdo: Top Canciones ── */}
        <aside className="hidden lg:block">
          <TopSongsWidget />
        </aside>

        {/* ── Feed central ── */}
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div
            className="flex gap-1 p-1"
            style={{
              background: "hsl(var(--card))",
              borderRadius: "14px",
              boxShadow: "0 2px 8px rgba(0,60,100,0.12), inset 0 1px 0 rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.50)",
            }}
          >
            {(["feed", "people"] as SocialTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-sm font-body font-medium transition-all"
                style={tab === t ? {
                  background: "rgba(255,255,255,0.70)",
                  color: "hsl(200,55%,22%)",
                  boxShadow: "0 2px 8px rgba(0,60,100,0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
                } : {
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                {t === "feed" ? "Feed" : "Personas"}
              </button>
            ))}
          </div>

          {tab === "feed" && (
            <>
              <CreatePost
                currentUserPhoto={currentUserPhoto}
                currentUsername={currentUsername}
                prefillSongs={pendingShareData?.songs ?? null}
                onPosted={fetchFeed}
                onCancelShare={onClearShare ?? (() => {})}
              />
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <Music2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-body text-sm">El feed está vacío.</p>
                  <p className="text-muted-foreground/60 font-body text-xs mt-1">Sigue a usuarios o comparte tu análisis.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((p) => (
                    <PostCard
                      key={p.post_id}
                      post={p}
                      currentUserId={currentUserId}
                      currentUserPhoto={currentUserPhoto}
                      currentUsername={currentUsername}
                      onLike={handleLike}
                      onViewProfile={setViewProfileId}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "people" && (
            <UsersPanel
              currentUserId={currentUserId}
              onFollowChanged={fetchFeed}
              onViewProfile={setViewProfileId}
            />
          )}
        </div>

        {/* ── Panel derecho: Recomendaciones ── */}
        <aside className="hidden lg:block">
          <RecommendationsWidget
            currentUserId={currentUserId}
            onFollowChanged={fetchFeed}
            onViewProfile={setViewProfileId}
          />
        </aside>
      </div>

    </div>
  );
};

export default SocialFeed;
