'use client'

import GoogleIntegrationCard from '@/app/dashboard/components/GoogleIntegrationCard'

export default function TestGooglePage() {
  return (
    <div className="min-h-screen bg-[#f4f7fa] p-4">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-lg font-black text-slate-800 mb-3">🧪 Test Google Integration</h1>
        <GoogleIntegrationCard />
      </div>
    </div>
  )
}