export function getToken() {
  return localStorage.getItem("pg_token");
}

export function setToken(token) {
  localStorage.setItem("pg_token", token);
}

export function clearToken() {
  localStorage.removeItem("pg_token");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (username, password) =>
    request("/api/auth/login", { method: "POST", body: { username, password } }),

  me: () => request("/api/auth/me"),

  logout: () => request("/api/auth/logout", { method: "POST" }),

  health: () => request("/api/health"),

  getNodes: () => request("/api/nodes"),

  getNode: (id) => request(`/api/nodes/${encodeURIComponent(id)}`),

  // --- ДОДАНО МЕТОД getFlows ---
  getFlows: () => request("/api/flows"),

  getEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/events${qs ? `?${qs}` : ""}`);      
  },

  sendCommand: (node_id, command_type, parameters = null) =>
    request("/api/commands", { method: "POST", body: { node_id, command_type, parameters } }),

  getCommands: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/commands${qs ? `?${qs}` : ""}`);
  },
  
  getAudit: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/audit${qs ? `?${qs}` : ""}`);
  },

  createNode: (payload) => request("/api/nodes", { method: "POST", body: payload }),
  updateNode: (id, payload) => request(`/api/nodes/${encodeURIComponent(id)}`, { method: "PUT", body: payload }),
  deleteNode: (id) => request(`/api/nodes/${encodeURIComponent(id)}`, { method: "DELETE" }),  

  ackEvent: (id) =>
    request(`/api/events/${encodeURIComponent(id)}/ack`, { method: "POST" }),
};