const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

let _token = localStorage.getItem("onejobs_token");

export const setToken = (t) => {
  _token = t;
  localStorage.setItem("onejobs_token", t);
};

export const clearToken = () => {
  _token = null;
  localStorage.removeItem("onejobs_token");
};

export const getToken = () => _token;

async function req(method, path, body) {
  const token = _token || localStorage.getItem("onejobs_token");

  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    console.error("API ERROR:", res.status, data);
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

export const authAPI = {
  login: (username, password) =>
    req("POST", "/api/auth/login", { username, password }),
};

export const leadsAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req("GET", `/api/leads${q ? "?" + q : ""}`);
  },
  get: (id) => req("GET", `/api/leads/${id}`),
  save: (lead) => req("POST", "/api/leads", lead),
  delete: (id) => req("DELETE", `/api/leads/${id}`),
  bulkImport: (leads) => req("POST", "/api/leads/bulk", { leads }),
};

export const txnAPI = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req("GET", `/api/transactions${q ? "?" + q : ""}`);
  },
  create: (txn) => req("POST", "/api/transactions", txn),
  update: (id, txn) => req("PUT", `/api/transactions/${id}`, txn),
  delete: (id) => req("DELETE", `/api/transactions/${id}`),
};

export const tasksAPI = {
  getAll: () => req("GET", "/api/tasks"),
  create: (task) => req("POST", "/api/tasks", task),
  update: (id, task) => req("PUT", `/api/tasks/${id}`, task),
  delete: (id) => req("DELETE", `/api/tasks/${id}`),
};

export const usersAPI = {
  getAll: () => req("GET", "/api/users"),
  save: (user) => req("POST", "/api/users", user),
  update: (id, user) => req("PUT", `/api/users/${id}`, user),
};

export const configAPI = {
  getAll: () => req("GET", "/api/config"),
  set: (key, value) => req("PUT", `/api/config/${key}`, { value }),
};

export const statsAPI = {
  get: () => req("GET", "/api/stats"),
};

export const vacanciesAPI = {
  getAll: () => req("GET", "/api/vacancies"),
  save: (vacancy) => req("POST", "/api/vacancies", vacancy),
  delete: (id) => req("DELETE", `/api/vacancies/${id}`),
};
