const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("vocalia_token");
}
function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export async function apiSignup(data: {
  username: string; email: string; password: string; sex: string;
}) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al registrarse"); }
  const json = await res.json();
  localStorage.setItem("vocalia_token", json.token);
  return json;
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Credenciales incorrectas"); }
  const json = await res.json();
  localStorage.setItem("vocalia_token", json.token);
  return json;
}

export function apiLogout() {
  localStorage.removeItem("vocalia_token");
}

// ── Análisis de voz ───────────────────────────────────────────────────────────
export interface SongResult {
  nombre:         string;
  freq_min:       number;
  freq_max:       number;
  freq_base:      number;
  bpm:            number;
  compatibilidad: number;
}

export interface VoiceAnalysisResult {
  min_freq:    number;
  max_freq:    number;
  base_freq:   number;
  top_songs:   SongResult[];
  model_used:  "weka" | "sklearn" | "rules" | "none";
  saved:       boolean;
  result_id:   string | null;
  voice_range: VoiceRange | null;
}

export interface ExtractFreqResult {
  frequency: number;
  nota:      string;
  tipo:      string;
  p10:       number;
  p90:       number;
  mediana:   number;
  media:     number;
  rango:     number;
}

// Paso 1-2-3: extrae la frecuencia de UNA grabación
export async function apiExtractFreq(
  audioBlob: Blob,
  tipo: "min" | "max" | "base",
): Promise<ExtractFreqResult> {
  const formData = new FormData();
  const ext = audioBlob.type.includes("ogg") ? ".ogg"
    : audioBlob.type.includes("wav") ? ".wav" : ".webm";
  formData.append("file", audioBlob, `recording${ext}`);
  formData.append("tipo", tipo);

  const res = await fetch(`${BASE_URL}/voice/extract-freq`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al extraer frecuencia"); }
  return res.json();
}

export interface AnalyzeVoiceExtra {
  medianFreq?: number;
  p10Base?:    number;
  p90Base?:    number;
  rangoBase?:  number;
  sexFilter?:  "M" | "F";
}

// Paso final: clasifica y recomienda con las 3 frecuencias
export async function apiAnalyzeVoice(
  minFreq:  number,
  maxFreq:  number,
  baseFreq: number,
  extra:    AnalyzeVoiceExtra = {},
): Promise<VoiceAnalysisResult> {
  const body = {
    min_freq:    minFreq,
    max_freq:    maxFreq,
    base_freq:   baseFreq,
    median_freq: extra.medianFreq ?? null,
    p10_base:    extra.p10Base   ?? null,
    p90_base:    extra.p90Base   ?? null,
    rango_base:  extra.rangoBase ?? null,
    sex_filter:  extra.sexFilter  ?? null,
  };
  const res = await fetch(`${BASE_URL}/voice/analyze`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al analizar voz"); }
  return res.json();
}

// ── Canciones ──────────────────────────────────────────────────────────────────
export async function apiGetSongs() {
  const res = await fetch(`${BASE_URL}/songs/`);
  if (!res.ok) throw new Error("Error al cargar canciones");
  return res.json();
}

// ── Perfil ──────────────────────────────────────────────────────────────────────
export interface VoiceRange {
  min_freq:  number;
  max_freq:  number;
  base_freq: number;
  min_note:  string;
  max_note:  string;
  base_note: string;
}

export async function apiUpdateProfile(
  username: string,
  photo: string | null,
  bio: string = "",
  voiceRange?: VoiceRange | null,
  removeVoice?: boolean,
) {
  const body: Record<string, unknown> = { username, photo, bio };
  if (removeVoice) body.remove_voice_range = true;
  else if (voiceRange !== undefined) body.voice_range = voiceRange;
  const res = await fetch(`${BASE_URL}/auth/profile`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al actualizar perfil"); }
  return res.json();
}

// ── Social — tipos ─────────────────────────────────────────────────────────────
export interface Post {
  post_id:       string;
  user_id:       string;
  username:      string;
  user_photo:    string | null;
  content:       string;
  image_url:     string | null;
  post_type:     "post" | "analysis_share";
  analysis_data: { songs: SongResult[] } | null;
  likes:         string[];
  liked_by_me:   boolean;
  created_at:    string;
}

export interface UserSummary {
  user_id:      string;
  username:     string;
  photo:        string | null;
  is_following: boolean;
}

export interface Notification {
  notif_id:      string;
  type:          string;
  from_username: string;
  from_photo:    string | null;
  post_id:       string | null;
  read:          boolean;
  created_at:    string;
}

// ── Social — funciones ─────────────────────────────────────────────────────────
export async function apiGetFeed(skip = 0, limit = 20) {
  const res = await fetch(`${BASE_URL}/social/feed?skip=${skip}&limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al cargar el feed");
  return res.json() as Promise<{ posts: Post[]; total: number }>;
}

export async function apiCreatePost(data: {
  content: string;
  image_url?: string;
  post_type?: string;
  analysis_data?: object;
}) {
  const res = await fetch(`${BASE_URL}/social/posts`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al publicar"); }
  return res.json();
}

export async function apiToggleLike(postId: string) {
  const res = await fetch(`${BASE_URL}/social/posts/${postId}/like`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al dar like");
  return res.json();
}

export async function apiGetUsers(q = "") {
  const url = q
    ? `${BASE_URL}/social/users?q=${encodeURIComponent(q)}`
    : `${BASE_URL}/social/users`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al buscar usuarios");
  return res.json() as Promise<{ users: UserSummary[] }>;
}

export async function apiFollowUser(targetId: string) {
  const res = await fetch(`${BASE_URL}/social/follow/${targetId}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al seguir"); }
  return res.json();
}

export async function apiUnfollowUser(targetId: string) {
  const res = await fetch(`${BASE_URL}/social/follow/${targetId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al dejar de seguir");
  return res.json();
}

export async function apiGetNotifications() {
  const res = await fetch(`${BASE_URL}/social/notifications`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al cargar notificaciones");
  return res.json() as Promise<{ notifications: Notification[]; unread: number }>;
}

export async function apiMarkNotifsRead() {
  const res = await fetch(`${BASE_URL}/social/notifications/read-all`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al marcar notificaciones");
  return res.json();
}

// ── Historial ──────────────────────────────────────────────────────────────────
export async function apiGetHistory() {
  const res = await fetch(`${BASE_URL}/history/`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al cargar historial");
  return res.json();
}

// ── Perfil público ─────────────────────────────────────────────────────────────
export interface ProfilePost {
  post_id:       string;
  content:       string;
  image_url:     string | null;
  post_type:     string;
  analysis_data: { songs: SongResult[] } | null;
  likes:         number;
  liked_by_me:   boolean;
  created_at:    string;
}

export interface UserProfile {
  user_id:      string;
  username:     string;
  photo:        string | null;
  bio?:         string;
  voice_range?: VoiceRange | null;
  followers:    number;
  following:    number;
  posts_count:  number;
  is_following: boolean;
  posts:        ProfilePost[];
}

export interface Comment {
  comment_id: string;
  user_id:    string;
  username:   string;
  user_photo: string | null;
  content:    string;
  created_at: string;
}

export async function apiGetProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/social/profile/${userId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Error al cargar perfil");
  return res.json();
}

export async function apiForgotPassword(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al enviar correo"); }
}

export async function apiResetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al restablecer contraseña"); }
}

export async function apiGetTopSongs(): Promise<{ top_songs: { nombre: string; count: number }[] }> {
  const res = await fetch(`${BASE_URL}/social/top-songs`);
  if (!res.ok) throw new Error("Error al cargar top canciones");
  return res.json();
}

export async function apiGetRecommendations(): Promise<{ recommendations: UserSummary[] }> {
  const res = await fetch(`${BASE_URL}/social/recommendations`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al cargar recomendaciones");
  return res.json();
}

// ── Comentarios ───────────────────────────────────────────────────────────────
export async function apiGetComments(postId: string): Promise<{ comments: Comment[] }> {
  const res = await fetch(`${BASE_URL}/social/posts/${postId}/comments`);
  if (!res.ok) throw new Error("Error al cargar comentarios");
  return res.json();
}

export async function apiAddComment(postId: string, content: string): Promise<Comment> {
  const res = await fetch(`${BASE_URL}/social/posts/${postId}/comments`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al comentar"); }
  return res.json();
}

export async function apiDeletePost(postId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/social/posts/${postId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al eliminar post"); }
}

export async function apiDeleteComment(postId: string, commentId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/social/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al eliminar comentario"); }
}

// ── Artista más similar ───────────────────────────────────────────────────────
export interface ArtistMatchResult {
  artista:        string;
  genero_musical: string;
  sex:            string;
  score:          number;
}

export async function apiGetArtistMatch(
  baseFreq:   number,
  minFreq:    number,
  maxFreq:    number,
  medianFreq: number | null,
  sex:        "M" | "F" | null,
): Promise<ArtistMatchResult> {
  const res = await fetch(`${BASE_URL}/voice/artist-match`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      base_freq:   baseFreq,
      min_freq:    minFreq,
      max_freq:    maxFreq,
      median_freq: medianFreq,
      sex,
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al buscar artista"); }
  return res.json();
}

// ── Dataset (recolección de datos) ────────────────────────────────────────────
export async function apiSubmitSample(
  audioBlob: Blob, sex: string, sessionId: string,
  nota: string, intentos: number, esUltima: boolean = false,
) {
  const formData = new FormData();
  const ext = audioBlob.type.includes("ogg") ? ".ogg"
    : audioBlob.type.includes("wav") ? ".wav" : ".webm";
  formData.append("file", audioBlob, `${sessionId}_${nota}${ext}`);
  formData.append("sex", sex);
  formData.append("session_id", sessionId);
  formData.append("nota", nota);
  formData.append("intentos", String(intentos));
  formData.append("es_ultima", String(esUltima));

  const res = await fetch(`${BASE_URL}/dataset/submit`, { method: "POST", body: formData });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al enviar muestra"); }
  return res.json();
}
