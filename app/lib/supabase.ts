import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Tambahkan pengecekan ini supaya build tidak gagal jika ENV belum ada
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Peringatan: Supabase URL atau Key belum terpasang di Environment Variables.")
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
)