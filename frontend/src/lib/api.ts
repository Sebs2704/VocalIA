// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken(): string | null {
  return localStorage.getItem("vocalia_token");
}
function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Auth ─────────────────────────────────────────────────────────────────
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

// ─── Dataset ──────────────────────────────────────────────────────────────
export async function apiSubmitSample(
  audioBlob: Blob,
  sex: string,
  sessionId: string,
  nota: string,
  intentos: number,
  esUltima: boolean = false,
) {
  const formData = new FormData();
  const ext = audioBlob.type.includes("ogg") ? ".ogg" : audioBlob.type.includes("wav") ? ".wav" : ".webm";
  formData.append("file", audioBlob, `${sessionId}_${nota}${ext}`);
  formData.append("sex", sex);
  formData.append("session_id", sessionId);
  formData.append("nota", nota);
  formData.append("intentos", String(intentos));
  formData.append("es_ultima", String(esUltima));

  const res = await fetch(`${BASE_URL}/dataset/submit`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al enviar muestra"); }
  return res.json();
}

// ─── Voice analysis ───────────────────────────────────────────────────────
export async function apiAnalyzeVoice(audioBlob: Blob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.wav");
  const res = await fetch(`${BASE_URL}/voice/analyze`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Error al analizar voz"); }
  return res.json();
}

// ─── History ──────────────────────────────────────────────────────────────
export async function apiGetHistory() {
  const res = await fetch(`${BASE_URL}/history/`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Error al cargar historial");
  return res.json();
}