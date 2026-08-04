// ── Authenticated fetch helper ───────────────────────────────────────────────
// Every /api call (except login) must carry the session JWT. This wraps fetch
// to inject `Authorization: Bearer <token>` from localStorage and to centralize
// 401 handling: on an expired/invalid session it clears the token and bounces
// the user to /login (via a broadcast the auth context listens for).

const TOKEN_KEY = 'terminal_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// Notifies the app (TerminalAuthContext) that the session is no longer valid.
function broadcastUnauthorized() {
  window.dispatchEvent(new CustomEvent('terminal:unauthorized'))
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'

  const res = await fetch(path, { ...options, headers })

  if (res.status === 401) {
    setToken(null)
    broadcastUnauthorized()
    throw new Error('Session expired — please log in again')
  }
  return res
}

// Convenience: apiFetch + JSON parse, throwing the server's error message.
export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.detail || `Request failed (HTTP ${res.status})`)
  return data
}
