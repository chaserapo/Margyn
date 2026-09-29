import { supabase } from './supabase';
import { computeJobDetail, computeJobSummary } from './margin';
import type { Job, JobDetail, JobSummary, MaterialLine, Settings, TimeEntry } from './types';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not signed in');
  return data.user.id;
}

export const api = {
  listJobs: async (): Promise<JobSummary[]> => {
    const [jobsRes, settingsRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, materials(cost_cents,qty), time_entries(hours)')
        .order('created_at', { ascending: false }),
      supabase.from('settings').select('*').single(),
    ]);
    if (jobsRes.error) throw jobsRes.error;
    if (settingsRes.error) throw settingsRes.error;

    const hourlyRateCents = (settingsRes.data as Settings).hourly_rate_cents;
    return (jobsRes.data as any[]).map((row) => {
      const { materials, time_entries, ...job } = row;
      return computeJobSummary(job as Job, materials ?? [], time_entries ?? [], hourlyRateCents);
    });
  },

  createJob: async (input: { client_name: string; quoted_price_cents: number }): Promise<Job> => {
    const { data, error } = await supabase.from('jobs').insert(input).select('*').single();
    if (error) throw error;
    return data as Job;
  },

  updateJob: async (id: string, input: { client_name: string; quoted_price_cents: number }): Promise<Job> => {
    const { data, error } = await supabase.from('jobs').update(input).eq('id', id).select('*').single();
    if (error) throw error;
    return data as Job;
  },

  deleteJob: async (id: string): Promise<void> => {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) throw error;
  },

  getJob: async (id: string): Promise<JobDetail> => {
    const [jobRes, materialsRes, timeRes, settingsRes] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', id).single(),
      supabase.from('materials').select('*').eq('job_id', id).order('created_at', { ascending: true }),
      supabase.from('time_entries').select('*').eq('job_id', id).order('created_at', { ascending: true }),
      supabase.from('settings').select('*').single(),
    ]);
    if (jobRes.error) throw jobRes.error;
    if (materialsRes.error) throw materialsRes.error;
    if (timeRes.error) throw timeRes.error;
    if (settingsRes.error) throw settingsRes.error;

    return computeJobDetail(
      jobRes.data as Job,
      materialsRes.data as MaterialLine[],
      timeRes.data as TimeEntry[],
      (settingsRes.data as Settings).hourly_rate_cents
    );
  },

  closeJob: async (id: string): Promise<Job> => {
    const { data, error } = await supabase
      .from('jobs')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Job;
  },

  addMaterial: async (jobId: string, input: { name: string; cost_cents: number; qty: number; receipt_path?: string }): Promise<MaterialLine> => {
    const { data, error } = await supabase
      .from('materials')
      .insert({ job_id: jobId, ...input })
      .select('*')
      .single();
    if (error) throw error;
    return data as MaterialLine;
  },

  getMaterial: async (id: string): Promise<MaterialLine> => {
    const { data, error } = await supabase.from('materials').select('*').eq('id', id).single();
    if (error) throw error;
    return data as MaterialLine;
  },

  updateMaterial: async (
    id: string,
    input: { name: string; cost_cents: number; qty: number; receipt_path?: string | null }
  ): Promise<MaterialLine> => {
    const { data, error } = await supabase.from('materials').update(input).eq('id', id).select('*').single();
    if (error) throw error;
    return data as MaterialLine;
  },

  deleteMaterial: async (id: string): Promise<void> => {
    const material = await api.getMaterial(id).catch(() => null);
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) throw error;
    if (material?.receipt_path) {
      await supabase.storage.from('receipts').remove([material.receipt_path]).catch(() => {});
    }
  },

  addTimeEntry: async (jobId: string, input: { hours: number; note?: string }): Promise<TimeEntry> => {
    const { data, error } = await supabase
      .from('time_entries')
      .insert({ job_id: jobId, ...input })
      .select('*')
      .single();
    if (error) throw error;
    return data as TimeEntry;
  },

  getTimeEntry: async (id: string): Promise<TimeEntry> => {
    const { data, error } = await supabase.from('time_entries').select('*').eq('id', id).single();
    if (error) throw error;
    return data as TimeEntry;
  },

  updateTimeEntry: async (id: string, input: { hours: number; note?: string }): Promise<TimeEntry> => {
    const { data, error } = await supabase.from('time_entries').update(input).eq('id', id).select('*').single();
    if (error) throw error;
    return data as TimeEntry;
  },

  deleteTimeEntry: async (id: string): Promise<void> => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) throw error;
  },

  uploadReceipt: async (localUri: string): Promise<string> => {
    const userId = await requireUserId();
    const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const res = await fetch(localUri);
    const arrayBuffer = await res.arrayBuffer();
    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
    if (error) throw error;
    return path;
  },

  deleteReceipt: async (path: string): Promise<void> => {
    await supabase.storage.from('receipts').remove([path]).catch(() => {});
  },

  getReceiptUrl: async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  },

  getSettings: async (): Promise<Settings> => {
    const { data, error } = await supabase.from('settings').select('*').single();
    if (error) throw error;
    return data as Settings;
  },

  updateSettings: async (input: Settings): Promise<Settings> => {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('settings')
      .upsert({ user_id: userId, ...input }, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) throw error;
    return data as Settings;
  },
};
