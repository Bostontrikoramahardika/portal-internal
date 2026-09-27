'use client';

export default function AppFooter() {
  return (
    <footer className="text-center py-4 px-3 mt-6 border-t border-[#e2e8f0]">
      <p
        className="text-[10px] font-medium tracking-wide"
        style={{
          fontStyle: 'italic',
          color: '#8896a7',
          opacity: 0.55,
        }}
      >
        BTM Mobile APP V1.7.0
      </p>
      <p
        className="text-[9px] font-medium tracking-wide mt-0.5"
        style={{
          fontStyle: 'italic',
          color: '#8896a7',
          opacity: 0.40,
        }}
      >
        Powered By rck_Production
      </p>
    </footer>
  );
}
