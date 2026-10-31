// app/lib/supabase-paginate.ts
// ═══════════════════════════════════════════════════════════════
// PENGAMBIL DATA TANPA BATAS 1.000 BARIS
//
// Supabase/PostgREST memotong hasil query di 1.000 baris (default).
// Satu periode absensi "Semua Site" bisa 4.000+ baris roster, jadi
// tanpa pagination data terpotong dan sel jadi kosong.
//
// Helper ini mengambil halaman demi halaman memakai .range() sampai
// habis, sehingga hasilnya lengkap.
// ═══════════════════════════════════════════════════════════════

export async function ambilSemua(
  db: any,
  tabel: string,
  kolom: string,
  terapkan?: (q: any) => any,
  urut: string[] = ['tanggal'],
  pageSize = 1000,
): Promise<any[]> {
  let hasil: any[] = []
  let dari = 0

  // batas aman supaya tidak infinite loop kalau server mengabaikan .range()
  const MAKS_HALAMAN = 200

  for (let halaman = 0; halaman < MAKS_HALAMAN; halaman++) {
    let q: any = db.from(tabel).select(kolom)
    if (terapkan) q = terapkan(q)
    for (const k of urut) q = q.order(k, { ascending: true })
    q = q.range(dari, dari + pageSize - 1)

    const { data, error } = await q
    if (error) throw new Error(`${tabel}: ${error.message}`)
    if (!data || data.length === 0) break

    hasil = hasil.concat(data)
    if (data.length < pageSize) break
    dari += pageSize
  }

  return hasil
}

/**
 * Sama seperti ambilSemua, tapi memecah daftar NRP per 200 orang
 * (batas panjang URL .in()) lalu memaginasi tiap potongan.
 */
export async function ambilSemuaPerNrp(
  db: any,
  tabel: string,
  kolom: string,
  nrpList: string[],
  terapkan?: (q: any) => any,
  urut: string[] = ['tanggal'],
  pageSize = 1000,
): Promise<any[]> {
  let hasil: any[] = []
  for (let i = 0; i < nrpList.length; i += 200) {
    const potong = nrpList.slice(i, i + 200)
    const bagian = await ambilSemua(
      db,
      tabel,
      kolom,
      (q) => {
        let x = q.in('nrp', potong)
        if (terapkan) x = terapkan(x)
        return x
      },
      urut,
      pageSize,
    )
    hasil = hasil.concat(bagian)
  }
  return hasil
}
