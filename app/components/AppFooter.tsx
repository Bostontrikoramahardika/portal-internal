import React from 'react';
import { APP_CONFIG } from '../config/version';

export default function AppFooter() {
  return (
    <div className="flex flex-col items-center justify-center mt-4 mb-3 text-center w-full shrink-0">
      <span className="text-[10px] font-extrabold text-slate-400 tracking-wider">
        {APP_CONFIG.name} {APP_CONFIG.version}
      </span>
      <span className="text-[9px] text-slate-300 font-medium">
        {APP_CONFIG.author}
      </span>
    </div>
  );
}
