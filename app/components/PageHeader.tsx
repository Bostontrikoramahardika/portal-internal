'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backUrl?: string
  badge?: string
  rightAction?: React.ReactNode
}

export default function PageHeader({ title, subtitle, backUrl, badge, rightAction }: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl)
    } else {
      router.back()
    }
  }

  return (
    <div className="bg-[#003d79] text-white rounded-[14px] p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm border border-[#002a57]/40 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={handleBack}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all shrink-0 border border-white/15"
          title="Kembali"
        >
          <svg className="w-4 h-4 fill-none stroke-currentColor stroke-[2.5]" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm sm:text-base font-black tracking-tight uppercase truncate">
              {title}
            </h1>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-900 shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-blue-100/80 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {rightAction && (
        <div className="shrink-0">
          {rightAction}
        </div>
      )}
    </div>
  )
}
