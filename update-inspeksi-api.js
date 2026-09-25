const fs = require('fs');
const path = require('path');

const dirAPI = './app/api/plant/inspeksi';
if (!fs.existsSync(dirAPI)) fs.mkdirSync(dirAPI, { recursive: true });

const apiCode = 'import { NextRequest, NextResponse } from "next/server";\n' +
'import { supabaseAdmin } from "@/app/lib/supabase-admin";\n\n' +
'export async function GET(request: NextRequest) {\n' +
'  try {\n' +
'    const { searchParams } = new URL(request.url);\n' +
'    const site = searchParams.get("site");\n' +
'    let query = supabaseAdmin.from("inspeksi_unit").select("*").order("created_at", { ascending: false });\n' +
'    if (site && site !== "ALL") query = query.eq("site", site);\n' +
'    const { data, error } = await query.limit(100);\n' +
'    if (error) throw error;\n' +
'    return NextResponse.json({ success: true, data: data || [] });\n' +
'  } catch (err: any) {\n' +
'    return NextResponse.json({ success: false, error: err.message }, { status: 500 });\n' +
'  }\n' +
'}\n\n' +
'export async function POST(request: NextRequest) {\n' +
'  try {\n' +
'    const body = await request.json();\n' +
'    const { data: inspeksiData, error } = await supabaseAdmin.from("inspeksi_unit").insert({\n' +
'      no_unit: body.no_unit,\n' +
'      shift: body.shift,\n' +
'      site: body.site,\n' +
'      inspector_nrp: body.inspector_nrp,\n' +
'      inspector_nama: body.inspector_nama,\n' +
'      operator: body.operator || "",\n' +
'      hm_km: parseFloat(body.hm_awal) || 0,\n' +
'      hm_akhir: parseFloat(body.hm_akhir) || 0,\n' +
'      type_breaker: body.type_breaker || "",\n' +
'      type_chisel: body.type_chisel || "",\n' +
'      status_kelayakan: body.status_kelayakan || "READY",\n' +
'      checklist: body.checklist || {},\n' +
'      temuan_tindakan: body.temuan_tindakan || [],\n' +
'      jenis_unit: body.jenis_unit || "EXCAVATOR & BREAKER"\n' +
'    }).select().single();\n\n' +
'    if (error) throw error;\n\n' +
'    // AUTO-CREATE PURCHASE REQUEST (PR) KHUSUS BACKLOG\n' +
'    if (Array.isArray(body.backlog_items) && body.backlog_items.length > 0) {\n' +
'      const validBacklogs = body.backlog_items.filter((b: any) => b.nama_barang && b.nama_barang.trim() !== "");\n' +
'      if (validBacklogs.length > 0) {\n' +
'        const prRows = validBacklogs.map((b: any) => ({\n' +
'          no_unit: body.no_unit,\n' +
'          part_number: b.part_number ? b.part_number.trim() : "PN-BACKLOG",\n' +
'          nama_barang: b.nama_barang.trim(),\n' +
'          qty: parseInt(b.qty) || 1,\n' +
'          satuan: b.satuan || "PCS",\n' +
'          prioritas: "BACKLOG",\n' +
'          status: "PENDING",\n' +
'          site: body.site || "MLP",\n' +
'          created_by: body.inspector_nama || "MEKANIK",\n' +
'          keterangan: "Auto-generated dari P2H Unit " + body.no_unit + " (" + (b.keterangan || "Temuan Backlog") + ")"\n' +
'        }));\n' +
'        await supabaseAdmin.from("purchase_requests").insert(prRows);\n' +
'      }\n' +
'    }\n\n' +
'    return NextResponse.json({ success: true, data: inspeksiData });\n' +
'  } catch (err: any) {\n' +
'    return NextResponse.json({ success: false, error: err.message }, { status: 500 });\n' +
'  }\n' +
'}\n';

fs.writeFileSync(path.join(dirAPI, 'route.ts'), apiCode, 'utf8');
console.log("✓ API Backend Inspeksi + Auto Backlog PR berhasil diperbarui!");
