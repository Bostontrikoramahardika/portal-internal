'use client';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const variantClasses = {
  primary: 'bg-[#003d79] hover:bg-[#003d79] text-white font-bold shadow-[0_4px_12px_rgba(0,61,121,0.2)]',
  secondary: 'bg-[#e8f0f8] hover:bg-[#d1e1f1] text-[#003d79] font-semibold',
  danger: 'bg-[#b91c1c] hover:bg-[#991b1b] text-white font-semibold shadow-[0_4px_12px_rgba(185,28,28,0.2)]',
  ghost: 'bg-transparent hover:bg-[#e8f0f8] text-[#5a6a7e] font-medium',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-[16px]',
  md: 'px-4 py-2.5 text-sm rounded-[20px]',
  lg: 'px-6 py-3 text-base rounded-[24px]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.97]'}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
