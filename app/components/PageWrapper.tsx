'use client'

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function PageWrapper({ children, className = '', noPadding = false }: PageWrapperProps) {
  return (
    <div className={`min-h-screen bg-[#f4f7fa] ${noPadding ? '' : 'p-2 sm:p-3 lg:p-4'} ${className}`}>
      <div className="max-w-7xl mx-auto space-y-3">
        {children}
      </div>
    </div>
  );
}
