'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'pending' | 'done' | 'urgent' | 'info' | 'navy';
  className?: string;
}

const variantClasses = {
  pending: 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]',
  done: 'bg-[#e6f5ed] text-[#0d7a3e] border-[#bbf7d0]',
  urgent: 'bg-[#fee2e2] text-[#b91c1c] border-[#fecaca]',
  info: 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]',
  navy: 'bg-[#e8f0f8] text-[#003d79] border-[#d1e1f1]',
};

export default function Badge({ children, variant = 'info', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        text-[10px] font-bold tracking-tight
        px-2.5 py-1 rounded-full border
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
