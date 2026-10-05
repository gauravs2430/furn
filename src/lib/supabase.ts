import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
const projectUrl = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '')

export const supabaseEnvMessage =
  projectUrl && anonKey
    ? null
    : 'Fill .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'

export const supabase: SupabaseClient | null = supabaseEnvMessage ? null : createClient(projectUrl, anonKey)
