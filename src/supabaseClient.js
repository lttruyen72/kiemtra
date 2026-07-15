import { createClient } from '@supabase/supabase-js';

// Get credentials from env or local storage
const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const envTable = import.meta.env.VITE_SUPABASE_TABLE || 'kiemtrahatang';

  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_anon_key');
  const localTable = localStorage.getItem('supabase_table') || 'kiemtrahatang';

  return {
    url: envUrl || localUrl || '',
    key: envKey || localKey || '',
    table: envUrl ? (import.meta.env.VITE_SUPABASE_TABLE || 'kiemtrahatang') : localTable
  };
};

export const config = getSupabaseConfig();

let supabase = null;

if (config.url && config.key) {
  try {
    supabase = createClient(config.url, config.key);
  } catch (error) {
    console.error('Lỗi khởi tạo Supabase Client:', error);
  }
}

export const getSupabaseClient = () => {
  if (supabase) return supabase;
  
  const currentConfig = getSupabaseConfig();
  if (currentConfig.url && currentConfig.key) {
    try {
      supabase = createClient(currentConfig.url, currentConfig.key);
      return supabase;
    } catch (e) {
      console.error('Không thể tạo Supabase client:', e);
    }
  }
  return null;
};

export const updateSupabaseConfig = (url, key, table) => {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_anon_key', key);
  localStorage.setItem('supabase_table', table || 'kiemtrahatang');
  
  try {
    supabase = createClient(url, key);
    return { success: true, client: supabase };
  } catch (error) {
    console.error('Lỗi khi cập nhật cấu hình Supabase:', error);
    return { success: false, error };
  }
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  localStorage.removeItem('supabase_table');
  supabase = null;
};
