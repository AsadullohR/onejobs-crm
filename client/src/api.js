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
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    if (data.duplicates) err.duplicates = data.duplicates;
    throw err;
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
  employees: (from, to) => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const q = p.toString();
    return req("GET", `/api/stats/employees${q ? "?" + q : ""}`);
  },
};

export const vacanciesAPI = {
  getAll: () => req("GET", "/api/vacancies"),
  create: (v) => req("POST", "/api/vacancies", v),
  update: (id, v) => req("PUT", `/api/vacancies/${id}`, v),
  delete: (id) => req("DELETE", `/api/vacancies/${id}`),
  getCandidates: (id) => req("GET", `/api/vacancies/${id}/candidates`),
  setPartners: (id, partnerIds) => req("PATCH", `/api/vacancies/${id}/partners`, { partnerIds }),
};

export const candidatesAPI = {
  create: (c) => req("POST", "/api/candidates", c),
  update: (id, c) => req("PUT", `/api/candidates/${id}`, c),
  delete: (id) => req("DELETE", `/api/candidates/${id}`),
  getByLead: (leadId) => req("GET", `/api/candidates?lead_id=${leadId}`),
  getAll: () => req("GET", "/api/candidates/all"),
};

export const employerAPI = {
  getWorkers: () => req("GET", "/api/employer/workers"),
  requestVacancy: (v) => req("POST", "/api/employer/vacancy-request", v),
};

export const notifAPI = {
  getAll: () => req("GET", "/api/notifications"),
  create: (message, type) => req("POST", "/api/notifications", { message, type }),
  sendTo: (message, type, userIds) => req("POST", "/api/notifications/send", { message, type, userIds }),
  markRead: (id) => req("PUT", `/api/notifications/${id}/read`, {}),
  markAllRead: () => req("PUT", "/api/notifications/read-all", {}),
  delete: (id) => req("DELETE", `/api/notifications/${id}`),
  clearRead: () => req("DELETE", "/api/notifications"),
};

export const extExpAPI = {
  getAll: () => req("GET", "/api/external-expenses"),
  create: (e) => req("POST", "/api/external-expenses", e),
  update: (id, e) => req("PUT", `/api/external-expenses/${id}`, e),
  delete: (id) => req("DELETE", `/api/external-expenses/${id}`),
};

export const debtsAPI = {
  getAll: () => req("GET", "/api/debts"),
  create: (d) => req("POST", "/api/debts", d),
  update: (id, d) => req("PUT", `/api/debts/${id}`, d),
  delete: (id) => req("DELETE", `/api/debts/${id}`),
};

export const leadDocsAPI = {
  getByLead: (leadId) => req("GET", `/api/leads/${leadId}/documents`),
  upsert: (leadId, docType, data) => req("PUT", `/api/leads/${leadId}/documents/${docType}`, data),
};

export const reportsAPI = {
  openMonthly: (month) => {
    const token = _token || localStorage.getItem("onejobs_token");
    const m = month || new Date().toISOString().slice(0,7);
    window.open(`${API}/api/reports/monthly?month=${m}&token=${token}`, '_blank');
  },
};

export const importAPI = {
  bulkLeads: (leads, ownerSalesId, skipDuplicates = true) =>
    req("POST", "/api/leads/bulk", { leads, ownerSalesId, skipDuplicates }),
  bulkFbLeads: (leads, ownerSalesId) =>
    req("POST", "/api/leads/bulk", { leads, ownerSalesId, checkByPhone: true }),
  checkDuplicate: (name, clientNo) =>
    req("POST", "/api/leads/check-duplicate", { name, clientNo }),
  clearLeadFinance: (leadId) =>
    req("DELETE", `/api/transactions/lead/${leadId}`),
};
