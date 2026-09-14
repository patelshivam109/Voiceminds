// src/lib/api.js
const BASE = "http://127.0.0.1:8000";
const TOKEN_KEY = "vm_token";
const USER_KEY = "vm_user";

/* =======================
 * Local storage helpers
 * ======================= */
export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  console.log("Retrieved token from localStorage:", token ? "Token exists" : "No token found");
  return token;
}

export function setToken(token) {
  console.log("Setting token in localStorage");
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  console.log("Clearing token from localStorage");
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse stored user payload:", error);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to persist user payload:", error);
  }
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
}

/* =======================
 * Auth header helper
 * ======================= */
export function authHeader() {
  const token = getToken();
  if (token) {
    console.log("Creating auth header with token");
    return { Authorization: `Bearer ${token}` };
  }
  console.log("No token available for auth header");
  return {};
}

/* =======================
 * Auth & user endpoints
 * ======================= */

// Use ONLY Accept + Authorization on GET (no Content-Type to avoid preflight)
export async function me() {
  const headers = {
    Accept: "application/json",
    ...authHeader(),
  };

  console.log("Making /api/me request with headers:", headers);

  const res = await fetch(`${BASE}/api/me`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  console.log("/api/me response status:", res.status);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("Error in /api/me:", errorData);
    throw new Error(errorData.message || `me ${res.status}`);
  }

  return res.json();
}

export async function loginReq(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // JSON body -> keep Content-Type
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  const data = await res.json();
  console.log("Login response:", data);

  if (!res.ok) throw new Error(data.message || "login failed");
  return data;
}

export async function registerReq(name, email, password) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // JSON body -> keep Content-Type
    body: JSON.stringify({ name, email, password }),
    credentials: "include",
  });

  const data = await res.json();
  console.log("Register response:", data);

  if (!res.ok) throw new Error(data.message || "register failed");
  return data;
}

// POST without body: omit Content-Type to avoid preflight; keep Accept optional
export async function verifyToken() {
  const headers = {
    Accept: "application/json",
    ...authHeader(),
  };

  console.log("Making /api/auth/verify request with headers:", headers);

  let res;
  try {
    res = await fetch(`${BASE}/api/auth/verify`, {
      method: "POST",
      headers,
      credentials: "include",
    });
  } catch (networkError) {
    const error = new Error(networkError.message || "Unable to reach auth service");
    error.status = 0;
    throw error;
  }

  console.log("/api/auth/verify response status:", res.status);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || "Token verification failed");
    error.status = res.status;
    throw error;
  }

  if (!data.valid) {
    const error = new Error(data.error || "Token invalid");
    error.status = 401;
    throw error;
  }

  console.log("Token verification response:", data);
  return data;
}

/* =======================
 * Audio endpoints
 * ======================= */

export async function uploadAudioSample(file, options = {}) {
  const { durationSec, includeTranscript } = options;

  const form = new FormData();
  form.append("file", file);
  if (durationSec !== undefined && durationSec !== null && !Number.isNaN(durationSec)) {
    form.append("duration_sec", String(durationSec));
  }
  if (includeTranscript) {
    form.append("include_transcript", "true");
  }

  const res = await fetch(`${BASE}/api/audio/upload`, {
    method: "POST",
    headers: {
      ...authHeader(), // DO NOT set Content-Type for FormData
    },
    body: form,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Upload failed");
  }

  return data.sample;
}

export async function listAudioSamples({ limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });

  const res = await fetch(`${BASE}/api/audio/list?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...authHeader(),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Unable to load audio samples");
  }

  return data;
}

export async function triggerInference(sampleId, { includeTranscript = false } = {}) {
  const params = new URLSearchParams();
  if (includeTranscript) params.set("include_transcript", "true");

  const query = params.toString();
  const url = query
    ? `${BASE}/api/audio/${sampleId}/infer?${query}`
    : `${BASE}/api/audio/${sampleId}/infer`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...authHeader(),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Unable to queue inference");
  }

  return data;
}

export async function fetchInferenceResult(sampleId) {
  const res = await fetch(`${BASE}/api/audio/${sampleId}/result`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...authHeader(),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "No inference result available");
  }

  return data.result;
}

export async function deleteAudioSample(sampleId) {
  const res = await fetch(`${BASE}/api/audio/${sampleId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...authHeader(),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Unable to delete audio sample");
  }

  return true;
}

/* =======================
 * Stats & insights endpoints
 * ======================= */

export async function fetchStatsSummary(range = "30d") {
  const params = new URLSearchParams({ range });

  const res = await fetch(`${BASE}/api/stats/summary?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...authHeader(),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Unable to load stats summary");
  }

  return data;
}

export async function listAIModels() {
  const res = await fetch(`${BASE}/api/insights/models`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...authHeader(),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Unable to list AI models");
  }

  return data;
}

export async function fetchEmotionalInsights(userId, timeRange) {
  const params = new URLSearchParams({ user_id: userId, range: timeRange });

  const res = await fetch(`${BASE}/api/insights/emotional?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...authHeader(),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Unable to load emotional insights");
  }

  return data;
}

export async function triggerEnhancedInference(sampleId, options = {}) {
  const { includeTranscript = false, includeAIAnalysis = false, aiModel = "mistral" } = options;

  const params = new URLSearchParams();
  if (includeTranscript) params.set("include_transcript", "true");
  if (includeAIAnalysis) params.set("include_ai_analysis", "true");
  if (aiModel) params.set("ai_model", aiModel);

  const query = params.toString();
  const url = query
    ? `${BASE}/api/audio/${sampleId}/enhanced-infer?${query}`
    : `${BASE}/api/audio/${sampleId}/enhanced-infer`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...authHeader(),
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Unable to queue enhanced inference");
  }

  return data;
}

/* =======================
 * Debug
 * ======================= */

// POST without body; omit Content-Type to avoid preflight
export async function debugHeaders() {
  try {
    const headers = {
      Accept: "application/json",
      ...authHeader(),
    };

    console.log("Making /api/debug/headers request with headers:", headers);

    const res = await fetch(`${BASE}/api/debug/headers`, {
      method: "POST",
      headers,
      credentials: "include",
    });

    const data = await res.json();
    console.log("Debug headers response:", data);
    return data;
  } catch (error) {
    console.error("Debug headers error:", error);
    return { error: error.message };
  }
}
