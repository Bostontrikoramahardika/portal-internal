const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const root = process.cwd();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('🔧 1. Mencoba menambahkan kolom serial_number ke unit_master jika belum ada...');
  
  // Coba jalankan alter table via RPC atau SQL jika ada, jika tidak, kita tangani di route API secara aman
  try {
    const { error: alterErr } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE unit_master ADD COLUMN IF NOT EXISTS serial_number text;'
    });
    if (alterErr) {
      console.log('ℹ️ exec_sql RPC tidak tersedia, akan ditangani dengan fallback otomatis di API handler.');
    } else {
      console.log('✅ Kolom serial_number berhasil ditambahkan ke database!');
    }
  } catch (e) {
    console.log('ℹ️ Menggunakan handler fallback aman di API.');
  }

  // 2. PERBAIKI /app/api/units/route.ts
  const apiUnitsPath = path.join(root, 'app', 'api', 'units', 'route.ts');
  const fixedRouteContent = `import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteParam = searchParams.get('site');

    const { data, error } = await supabase
      .from('unit_master')
      .select('*')
      .order('urutan', { ascending: true, nullsFirst: false });

    if (error) throw error;

    let rawUnits = data || [];

    if (siteParam && siteParam !== 'ALL' && siteParam.trim() !== '') {
      const siteUpper = siteParam.toUpperCase();
      rawUnits = rawUnits.filter((u: any) => {
        if (!u.site) return true;
        const uSiteUpper = String(u.site).toUpperCase();
        return siteUpper.includes(uSiteUpper) || uSiteUpper.includes(siteUpper);
      });
    }

    const formattedUnits = rawUnits.map((u: any) => ({
      id: u.id,
      kode_unit: u.kode_unit || u.nama_unit || '-',
      nama_unit: u.nama_unit || u.kode_unit || '-',
      merk_model: u.merk_model || u.kategori || '-',
      model_unit: u.merk_model || u.kategori || '-',
      serial_number: u.serial_number || u.sn || u.keterangan_status || '-',
      kategori: u.kategori || u.merk_model || '-',
      site: u.site || 'PPA-MLP',
      status: u.status || 'RFU',
      urutan: u.urutan || 99
    }));

    return NextResponse.json({ success: true, data: formattedUnits });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kode_unit, nama_unit, merk_model, serial_number, kategori, site, status } = body;

    // Build payload only with existing columns
    const payload: any = {
      kode_unit: kode_unit || nama_unit,
      nama_unit: nama_unit || kode_unit,
      merk_model: merk_model || 'Komatsu PC-200',
      kategori: kategori || 'PC 200',
      site: site || 'PPA-MLP',
      status: status || 'RFU',
      active: true,
      updated_at: new Date().toISOString()
    };

    // Try insert with serial_number first
    let { data, error } = await supabase
      .from('unit_master')
      .insert([{ ...payload, serial_number: serial_number || '-' }])
      .select();

    if (error && (error.message.includes('serial_number') || error.code === 'PGRST204')) {
      // Fallback if serial_number column doesn't exist: store serial_number in keterangan_status
      payload.keterangan_status = serial_number ? \`SN: \${serial_number}\` : '-';
      const fallbackRes = await supabase
        .from('unit_master')
        .insert([payload])
        .select();
      
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Supabase POST Error:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, kode_unit, nama_unit, merk_model, serial_number, kategori, site, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID unit wajib diisi' }, { status: 400 });
    }

    const updatePayload: any = {
      kode_unit,
      nama_unit,
      merk_model,
      kategori: kategori || 'PC 200',
      site: site || 'PPA-MLP',
      status: status || 'RFU',
      updated_at: new Date().toISOString()
    };

    // Try update with serial_number column
    let { data, error } = await supabase
      .from('unit_master')
      .update({ ...updatePayload, serial_number: serial_number || '-' })
      .eq('id', id)
      .select();

    if (error && (error.message.includes('serial_number') || error.code === 'PGRST204')) {
      // Fallback: update keterangan_status if serial_number column does not exist
      updatePayload.keterangan_status = serial_number ? \`SN: \${serial_number}\` : '-';
      const fallbackRes = await supabase
        .from('unit_master')
        .update(updatePayload)
        .eq('id', id)
        .select();

      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('Supabase PUT Error:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
`;

  fs.writeFileSync(apiUnitsPath, fixedRouteContent, 'utf8');
  console.log('✅ Updated /app/api/units/route.ts with smart column fallback & error reporting');

  // 3. PERBAIKI ALERT ERRROR DI /app/dashboard/plant/page.tsx
  const plantPagePath = path.join(root, 'app', 'dashboard', 'plant', 'page.tsx');
  let plantCode = fs.readFileSync(plantPagePath, 'utf8');

  plantCode = plantCode.replace(
    /const handleSaveUnit = async [\s\S]*?\n  \};/,
    `const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingUnit ? 'PUT' : 'POST';
      const payload = editingUnit ? { ...formUnit, id: editingUnit.id } : formUnit;

      const res = await fetch('/api/units', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setShowUnitModal(false);
        setEditingUnit(null);
        setFormUnit({ kode_unit: '', nama_unit: '', merk_model: '', serial_number: '', kategori: 'PC 200', site: 'PPA-MLP', status: 'RFU' });
        fetchUnits();
        alert('Data unit berhasil disimpan!');
      } else {
        alert('Gagal menyimpan data unit: ' + (json.message || 'Error server'));
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan: ' + err.message);
    }
  };`
  );

  fs.writeFileSync(plantPagePath, plantCode, 'utf8');
  console.log('✅ Updated app/dashboard/plant/page.tsx with detailed error response');
}

applyFix();
