'use client'

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 sm:p-6',
};

export default function Card({ children, className = '', padding = 'md', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-[14px] border border-[#e2e8f0]
        shadow-[0_1px_3px_rgba(0,61,121,0.06)]
        ${paddingMap[padding]}
        ${hover ? 'hover:shadow-[0_4px_16px_rgba(0,61,121,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
