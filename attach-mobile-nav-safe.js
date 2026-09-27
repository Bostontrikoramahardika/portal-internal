const fs = require("fs");
const path = require("path");

console.log("=======================================================");
console.log("MEMASANG MOBILE BOTTOM NAV (SAFE WRITE, ZERO SYNTAX ERROR)");
console.log("=======================================================\n");

const componentsDir = path.join(process.cwd(), "app", "components");
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

const lines = [];
lines.push('"use client";');
lines.push("import React, { useState } from \"react\";");
lines.push("import Link from \"next/link\";");
lines.push("import { usePathname, useSearchParams } from \"next/navigation\";");
lines.push("");
lines.push("export default function MobileBottomNav() {");
lines.push("  const pathname = usePathname() || \"\";");
lines.push("  const searchParams = useSearchParams();");
lines.push("  const menuParam = searchParams ? searchParams.get(\"menu\") : null;");
lines.push("  const [showMore, setShowMore] = useState(false);");
lines.push("");
lines.push("  const isActive = (path, menu) => {");
lines.push("    if (menu && menuParam) return menuParam === menu;");
lines.push("    if (pathname === path && !menuParam) return true;");
lines.push("    return false;");
lines.push("  };");
lines.push("");
lines.push("  const moreMenus = [");
lines.push("    { label: \"Leader\", href: \"/dashboard/crew-on-duty\" },");
lines.push("    { label: \"HR\", href: \"/dashboard/hr-dashboard\" },");
lines.push("    { label: \"Safety\", href: \"/dashboard/monitoring-apd\" },");
lines.push("    { label: \"Admin\", href: \"/dashboard/kelola-akses\" },");
lines.push("    { label: \"Plant\", href: \"/dashboard/plant\" },");
lines.push("    { label: \"Site\", href: \"/dashboard/monitoring-mcu\" },");
lines.push("    { label: \"HO\", href: \"/dashboard/rekrutmen\" }");
lines.push("  ];");
lines.push("");
lines.push("  const absensiActive = isActive(\"/dashboard\", \"absensi_saya\");");
lines.push("  const pengajuanActive = isActive(\"/dashboard\", \"form_cuti\");");
lines.push("  const sayaActive = pathname.indexOf(\"saya\") !== -1;");
lines.push("");
lines.push("  return (");
lines.push("    <>");
lines.push("      <div className=\"h-20 sm:hidden block w-full\" />");
lines.push("");
lines.push("      <div className=\"fixed bottom-0 left-0 right-0 sm:hidden z-50 px-3 pb-3 pt-1\">");
lines.push("        <div className=\"bg-white rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-[#e2e8f0] px-2 py-2 flex items-center justify-between relative\">");
lines.push("");
lines.push("          <Link href=\"/dashboard?menu=absensi_saya\" className=\"flex flex-col items-center justify-center w-[20%]\">");
lines.push("            <svg className={absensiActive ? \"w-5 h-5 text-[#003d79]\" : \"w-5 h-5 text-[#8896a7]\"} fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">");
lines.push("              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6\" />");
lines.push("            </svg>");
lines.push("            <span className={absensiActive ? \"text-[10px] mt-1 font-bold text-[#003d79]\" : \"text-[10px] mt-1 font-bold text-[#8896a7]\"}>Absensi</span>");
lines.push("          </Link>");
lines.push("");
lines.push("          <Link href=\"/dashboard?menu=form_cuti\" className=\"flex flex-col items-center justify-center w-[20%]\">");
lines.push("            <svg className={pengajuanActive ? \"w-5 h-5 text-[#003d79]\" : \"w-5 h-5 text-[#8896a7]\"} fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">");
lines.push("              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z\" />");
lines.push("            </svg>");
lines.push("            <span className={pengajuanActive ? \"text-[10px] mt-1 font-bold text-[#003d79]\" : \"text-[10px] mt-1 font-bold text-[#8896a7]\"}>Pengajuan</span>");
lines.push("          </Link>");
lines.push("");
lines.push("          <div className=\"w-[20%] flex justify-center relative\">");
lines.push("            <Link");
lines.push("              href=\"/dashboard/scan-qr\"");
lines.push("              className=\"absolute -top-8 bg-[#003d79] text-white p-3.5 rounded-full border-[3px] border-[#f4f7fa] active:scale-95\"");
lines.push("              style={{ boxShadow: \"0 6px 20px rgba(0, 61, 121, 0.45)\" }}");
lines.push("            >");
lines.push("              <svg className=\"w-6 h-6\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">");
lines.push("                <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z\" />");
lines.push("              </svg>");
lines.push("            </Link>");
lines.push("            <span className=\"text-[10px] mt-6 font-bold text-[#8896a7]\">Scan</span>");
lines.push("          </div>");
lines.push("");
lines.push("          <Link href=\"/dashboard/mcu-saya\" className=\"flex flex-col items-center justify-center w-[20%]\">");
lines.push("            <svg className={sayaActive ? \"w-5 h-5 text-[#003d79]\" : \"w-5 h-5 text-[#8896a7]\"} fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">");
lines.push("              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z\" />");
lines.push("            </svg>");
lines.push("            <span className={sayaActive ? \"text-[10px] mt-1 font-bold text-[#003d79]\" : \"text-[10px] mt-1 font-bold text-[#8896a7]\"}>Saya</span>");
lines.push("          </Link>");
lines.push("");
lines.push("          <button type=\"button\" onClick={function () { setShowMore(true); }} className=\"flex flex-col items-center justify-center w-[20%] text-[#8896a7]\">");
lines.push("            <svg className=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">");
lines.push("              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M4 6h16M4 12h16M4 18h16\" />");
lines.push("            </svg>");
lines.push("            <span className=\"text-[10px] mt-1 font-bold\">More</span>");
lines.push("          </button>");
lines.push("        </div>");
lines.push("      </div>");
lines.push("");
lines.push("      {showMore ? (");
lines.push("        <div className=\"fixed inset-0 z-[60] flex items-end sm:hidden\">");
lines.push("          <div className=\"absolute inset-0 bg-black/50\" onClick={function () { setShowMore(false); }} />");
lines.push("          <div className=\"bg-white w-full rounded-t-[28px] p-6 relative z-10 border-t border-[#e2e8f0]\">");
lines.push("            <div className=\"w-12 h-1.5 bg-[#e2e8f0] rounded-full mx-auto mb-5\" />");
lines.push("            <div className=\"flex items-center justify-between mb-6\">");
lines.push("              <h3 className=\"text-[#1a2332] font-extrabold text-base\">Menu Lainnya</h3>");
lines.push("              <span className=\"text-xs text-[#8896a7]\">BTM V1.7.0</span>");
lines.push("            </div>");
lines.push("            <div className=\"grid grid-cols-4 gap-4\">");
lines.push("              {moreMenus.map(function (item) {");
lines.push("                return (");
lines.push("                  <Link key={item.label} href={item.href} onClick={function () { setShowMore(false); }} className=\"flex flex-col items-center text-center gap-1.5\">");
lines.push("                    <div className=\"w-12 h-12 rounded-2xl bg-[#f4f7fa] text-[#003d79] flex items-center justify-center border border-[#e2e8f0] text-sm font-black\">");
lines.push("                      {item.label.charAt(0)}");
lines.push("                    </div>");
lines.push("                    <span className=\"text-xs font-bold text-[#5a6a7e]\">{item.label}</span>");
lines.push("                  </Link>");
lines.push("                );");
lines.push("              })}");
lines.push("            </div>");
lines.push("            <button type=\"button\" onClick={function () { setShowMore(false); }} className=\"w-full mt-6 py-3 bg-[#f8fafc] text-[#1a2332] rounded-xl font-extrabold border border-[#e2e8f0]\">");
lines.push("              Tutup");
lines.push("            </button>");
lines.push("          </div>");
lines.push("        </div>");
lines.push("      ) : null}");
lines.push("    </>");
lines.push("  );");
lines.push("}");
lines.push("");

const navPath = path.join(componentsDir, "MobileBottomNav.tsx");
fs.writeFileSync(navPath, lines.join("\n"), "utf8");
console.log("Created: app/components/MobileBottomNav.tsx");

// Inject ke dashboard layout
const layoutPath = path.join(process.cwd(), "app", "dashboard", "layout.tsx");
let layout = fs.readFileSync(layoutPath, "utf8");

if (!layout.includes("MobileBottomNav")) {
  if (!layout.includes("from '@/app/components/MobileBottomNav'") && !layout.includes('from "@/app/components/MobileBottomNav"')) {
    layout = 'import MobileBottomNav from "@/app/components/MobileBottomNav";\n' + layout;
  }

  if (layout.includes("</main>")) {
    layout = layout.replace("</main>", "      <MobileBottomNav />\n    </main>");
  } else {
    const idx = layout.lastIndexOf("</div>");
    if (idx !== -1) {
      layout = layout.slice(0, idx) + "      <MobileBottomNav />\n" + layout.slice(idx);
    }
  }

  fs.writeFileSync(layoutPath, layout, "utf8");
  console.log("Attached <MobileBottomNav /> into app/dashboard/layout.tsx");
} else {
  console.log("MobileBottomNav already referenced in layout");
}

// Verify
const verifyLayout = fs.readFileSync(layoutPath, "utf8");
const verifyNav = fs.existsSync(navPath);
console.log("\nVERIFY:");
console.log("  MobileBottomNav.tsx exists:", verifyNav ? "YES" : "NO");
console.log("  Import in layout:", verifyLayout.includes("MobileBottomNav") ? "YES" : "NO");
console.log("  JSX tag in layout:", verifyLayout.includes("<MobileBottomNav") ? "YES" : "NO");
console.log("=======================================================");
