const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', 'components', 'MobileBottomNav.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `              })}
            </div>
          </div>
        </div>
      )}`;

const replacementStr = `              })}
            </div>

            {/* TOMBOL KELUAR APLIKASI (KHUSUS TAB SAYA) */}
            {activeTab === 'saya' && (
              <div className="pt-2 pb-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm active:scale-95 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Keluar Aplikasi
                </button>
              </div>
            )}
          </div>
        </div>
      )}`;

if (content.includes('Keluar Aplikasi')) {
  console.log('Tombol Keluar Aplikasi sudah ada!');
} else if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('BERHASIL: Tombol Keluar Aplikasi ditambahkan ke MobileBottomNav.tsx');
} else {
  console.error('ERROR: Target string tidak ditemukan. Memeriksa isi file...');
  const lines = content.split('\n');
  console.log(lines.slice(170, 185).join('\n'));
}