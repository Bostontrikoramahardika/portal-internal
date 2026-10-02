'use client'

import GoogleIntegrationCard from '@/app/dashboard/components/GoogleIntegrationCard'

export default function TestGooglePage() {
  return (
<div className="min-h-screen pb-24 sm:pb-8  bg-[#f4f7fa] p-4">

      {/* Auto-injected Uniform Header with Back Button */}
      <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-[14px] border border-[#e2e8f0] shadow-sm">
        <button 
          onClick={() => window.history.back()} 
          className="p-2 rounded-lg bg-[#003d79]/10 text-[#003d79] hover:bg-[#003d79]/20 transition-colors flex items-center justify-center"
          title="Kembali"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-[#1a2332]">Menu Portal</h1>
          <p className="text-xs text-[#5a6a7e]">PT Boston Price Automation</p>
        </div>
      </div>
    
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-lg font-black text-slate-800 mb-3">🧪 Test Google Integration</h1>
        <GoogleIntegrationCard />
      </div>
    

      </div>
  )
}