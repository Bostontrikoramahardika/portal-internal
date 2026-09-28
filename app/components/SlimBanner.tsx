import React from 'react';

interface SlimBannerProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
}

export default function SlimBanner({ title, subtitle, icon, color = 'bg-[#003d79]' }: SlimBannerProps) {
  return (
    <div className={color + ' text-white px-4 py-3 mx-4 mt-3 mb-3 rounded-xl shadow-sm flex items-center justify-between'}>
      <div className='flex items-center gap-2.5'>
        {icon && <div className='text-lg flex-shrink-0'>{icon}</div>}
        <div className='flex flex-col'>
          <h2 className='font-bold text-sm tracking-wide leading-tight'>{title}</h2>
          {subtitle && <p className='text-[11px] text-blue-100/90 leading-tight mt-0.5'>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}