import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

/**
 * PUBLIC ENDPOINT - No authentication required
 * Digunakan di halaman login untuk populate dropdown Site Kerja
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('sites_config')
      .select('nama_site, kode_site, is_pusat')
      .eq('is_active', true)
      .order('is_pusat', { ascending: false })
      .order('nama_site', { ascending: true })

    if (error) {
      console.error('Public sites error:', error)
      return NextResponse.json({ sites: [] })
    }

    return NextResponse.json({ sites: data || [] })
  } catch (err: any) {
    console.error('Public sites exception:', err)
    return NextResponse.json({ sites: [] })
  }
}