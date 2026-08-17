import { API_URL } from './config';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function request(path, { method = 'GET', body, query, responseType = 'json' } = {}) {
  let url = `${API_URL}${path}`;
  if (query) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null))
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      message = errBody.error || message;
    } catch {
      // response wasn't JSON; keep the generic message
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  if (responseType === 'blob') return res.blob();
  return res.json();
}

// --- Auth ---
export const auth = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
};

// --- Push tokens ---
export const pushTokens = {
  register: (token, platform) => request('/push-tokens', { method: 'POST', body: { token, platform } }),
};

// --- Medications (F1) ---
export const medications = {
  list: (patientId) => request(`/patients/${patientId}/medications`),
  get: (patientId, id) => request(`/patients/${patientId}/medications/${id}`),
  create: (patientId, payload) =>
    request(`/patients/${patientId}/medications`, { method: 'POST', body: payload }),
  update: (patientId, id, payload) =>
    request(`/patients/${patientId}/medications/${id}`, { method: 'PATCH', body: payload }),
  remove: (patientId, id) =>
    request(`/patients/${patientId}/medications/${id}`, { method: 'DELETE' }),
};

// --- Doses (F2/F3) ---
export const doses = {
  list: (patientId, { from, to } = {}) =>
    request(`/patients/${patientId}/doses`, { query: { from, to } }),
  confirm: (patientId, doseId) =>
    request(`/patients/${patientId}/doses/${doseId}/confirm`, { method: 'POST' }),
  snooze: (patientId, doseId) =>
    request(`/patients/${patientId}/doses/${doseId}/snooze`, { method: 'POST' }),
};

// --- Reports (F5) ---
export const reports = {
  weekly: (patientId, { from, to } = {}) =>
    request(`/patients/${patientId}/reports/weekly`, { query: { from, to } }),
  trend: (patientId, { periods = 6, unit = 'week' } = {}) =>
    request(`/patients/${patientId}/reports/trend`, { query: { periods, unit } }),
};

// --- Caregiver (F4, UC3, UC4) ---
export const caregiver = {
  linkPatient: (patientEmail, relationship) =>
    request('/caregiver/links', { method: 'POST', body: { patientEmail, relationship } }),
  myPatients: () => request('/caregiver/patients'),
  patientDashboard: (patientId) => request(`/caregiver/patients/${patientId}/dashboard`),
};

// --- Consent grants (NF4/UC6): which clinicians a patient has opted in ---
export const consents = {
  list: (patientId) => request(`/patients/${patientId}/consents`),
};

// --- Consultation requests: caregiver asks a consented clinician to weigh in ---
export const consultations = {
  list: (patientId) => request(`/patients/${patientId}/consultations`),
  create: (patientId, { clinicianId, message }) =>
    request(`/patients/${patientId}/consultations`, { method: 'POST', body: { clinicianId, message } }),
  resolve: (patientId, id) =>
    request(`/patients/${patientId}/consultations/${id}/resolve`, { method: 'PATCH' }),
};

// --- Clinician (UC5/UC6, NF4: adherence-only, consent-gated) ---
export const clinician = {
  myPatients: () => request('/clinician/patients'),
  inbox: () => request('/clinician/consultations'),
};
