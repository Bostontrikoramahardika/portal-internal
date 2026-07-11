// app/api/public/sites/route.ts
// 🌐 PUBLIC ENDPOINT — Untuk fetch daftar site di halaman Login (tanpa auth)

import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('sites_config')
      .select('nama_site, kode_site, is_pusat')
      .eq('active', true)
      .eq('is_active', true)
      .order('nama_site', { ascending: true })

    if (error) {
      console.error('Fetch sites error:', error)
      return NextResponse.json({ 
        sites: [], 
        error: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      sites: data || [] 
    })
  } catch (err: any) {
    return NextResponse.json({ 
      sites: [], 
      error: err.message 
    }, { status: 500 })
  }
}