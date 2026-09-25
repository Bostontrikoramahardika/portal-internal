import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// In-Memory Fallback Storage jika tabel DB belum terbuat
let memoryTemplates: Record<string, any[]> = {};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const modelKey = searchParams.get('key') || 'GENERAL';

    // 1. Cek di Supabase jika ada tabel inspeksi_templates
    try {
      const { data, error } = await supabase
        .from('inspeksi_templates')
        .select('*')
        .eq('template_key', modelKey);

      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, key: modelKey, items: data[0].items });
      }
    } catch (err) {}

    // 2. Fallback memory atau default items
    if (memoryTemplates[modelKey]) {
      return NextResponse.json({ success: true, key: modelKey, items: memoryTemplates[modelKey] });
    }

    return NextResponse.json({ success: true, key: modelKey, items: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { template_key, items } = body; // template_key: misal "Komatsu PC-200" atau "BREAKER"

    memoryTemplates[template_key] = items;

    try {
      await supabase
        .from('inspeksi_templates')
        .upsert([{ template_key, items, updated_at: new Date().toISOString() }], { onConflict: 'template_key' });
    } catch (err) {}

    return NextResponse.json({ success: true, message: `Format inspeksi untuk '${template_key}' berhasil disimpan!`, count: items.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
