'use client';

interface IconProps {
  children: React.ReactNode;
  size?: number;
  color?: string;
  bg?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const roundedMap = {
  sm: 'rounded-[8px]',
  md: 'rounded-[12px]',
  lg: 'rounded-[16px]',
  full: 'rounded-full',
};

export default function Icon({
  children,
  size = 40,
  color = '#003d79',
  bg = '#e8f0f8',
  rounded = 'md',
  className = '',
}: IconProps) {
  return (
    <div
      className={`
        flex items-center justify-center flex-shrink-0
        ${roundedMap[rounded]}
        ${className}
      `}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: color,
      }}
    >
      {children}
    </div>
  );
}

// SVG Line Icon helper
export function SvgIcon({ d, size = 20, className = '' }: { d: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
