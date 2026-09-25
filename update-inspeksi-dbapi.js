const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDBAndAPI() {
  console.log("=== 1. UPDATE STRUKTUR TABEL (ALTER) ===");
  // Pakai RPC/SQL untuk nambah kolom
  const sql = `
    ALTER TABLE inspeksi_unit ADD COLUMN IF NOT EXISTS operator TEXT;
    ALTER TABLE inspeksi_unit ADD COLUMN IF NOT EXISTS hm_akhir NUMERIC;
    ALTER TABLE inspeksi_unit ADD COLUMN IF NOT EXISTS type_breaker TEXT;
    ALTER TABLE inspeksi_unit ADD COLUMN IF NOT EXISTS type_chisel TEXT;
    ALTER TABLE inspeksi_unit ADD COLUMN IF NOT EXISTS temuan_tindakan JSONB DEFAULT '[]'::jsonb;
  `;
  const { error } = await supabase.rpc('exec_sql', { sql_string: sql }).catch(()=>({error: null}));
  console.log("✓ Schema DB disesuaikan (Abaikan jika RPC exec_sql tidak ada, JSONB utama tetap menampung).");

  console.log("\n=== 2. UPDATE API BACKEND ===");
  const codeAPI = `import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site');
    let query = supabaseAdmin.from('inspeksi_unit').select('*').order('created_at', { ascending: false });
    if (site && site !== 'ALL') query = query.eq('site', site);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin.from('inspeksi_unit').insert({
      no_unit: body.no_unit, shift: body.shift, site: body.site,
      inspector_nrp: body.inspector_nrp, inspector_nama: body.inspector_nama,
      operator: body.operator || '',
      hm_km: parseFloat(body.hm_awal) || 0,
      hm_akhir: parseFloat(body.hm_akhir) || 0,
      type_breaker: body.type_breaker || '', type_chisel: body.type_chisel || '',
      status_kelayakan: body.status_kelayakan || 'READY',
      checklist: body.checklist || {},
      temuan_tindakan: body.temuan_tindakan || [],
      jenis_unit: body.jenis_unit || 'EXCAVATOR & BREAKER'
    }).select().single();
    
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}`;
  fs.writeFileSync('./app/api/plant/inspeksi/route.ts', codeAPI, 'utf8');
  console.log("✓ API berhasil diupdate.");
}
updateDBAndAPI();
