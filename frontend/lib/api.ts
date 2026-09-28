import { supabase } from './supabase';
import { computeJobDetail } from './margin';
import type { Job, JobDetail, MaterialLine, Settings, TimeEntry } from './types';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not signed in');
  return data.user.id;
}

export const api = {
  listJobs: async (): Promise<Job[]> => {
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Job[];
  },

  createJob: async (input: { client_name: string; quoted_price_cents: number }): Promise<Job> => {
    const { data, error } = await supabase.from('jobs').insert(input).select('*').single();
    if (error) throw error;
    return data as Job;
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

  addMaterial: async (jobId: string, input: { name: string; cost_cents: number; qty: number }): Promise<MaterialLine> => {
    const { data, error } = await supabase
      .from('materials')
      .insert({ job_id: jobId, ...input })
      .select('*')
      .single();
    if (error) throw error;
    return data as MaterialLine;
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
