import Constants from 'expo-constants';
import type { Job, JobDetail, Settings } from './types';

const API_BASE =
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
  process.env.EXPO_PUBLIC_API_BASE ??
  'http://localhost:8000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listJobs: () => request<Job[]>('/jobs'),
  createJob: (data: { client_name: string; quoted_price_cents: number }) =>
    request<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  getJob: (id: string) => request<JobDetail>(`/jobs/${id}`),
  closeJob: (id: string) => request<Job>(`/jobs/${id}/close`, { method: 'POST' }),

  addMaterial: (jobId: string, data: { name: string; cost_cents: number; qty: number }) =>
    request(`/jobs/${jobId}/materials`, { method: 'POST', body: JSON.stringify(data) }),

  addTimeEntry: (jobId: string, data: { hours: number; note?: string }) =>
    request(`/jobs/${jobId}/time-entries`, { method: 'POST', body: JSON.stringify(data) }),

  getSettings: () => request<Settings>('/settings'),
  updateSettings: (data: Settings) =>
    request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
