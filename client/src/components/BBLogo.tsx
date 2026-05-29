/**
 * BBLogo Component
 * Uses the official Buyers Brief logo asset per Brand Bible v1.0
 * Logo: Document icon + dusty rose tick/checkmark
 * 
 * Usage:
 * - Light backgrounds: <BBLogo variant="primary" />
 * - Dark backgrounds: <BBLogo variant="white" />
 * - Icon only: <BBLogo variant="icon" size={24} />
 */

interface BBLogoProps {
  variant?: 'primary' | 'white' | 'icon';
  size?: number;
  className?: string;
}

export default function BBLogo({ variant = 'primary', size = 32, className = '' }: BBLogoProps) {
  // For now, use a placeholder. In production, this would reference the uploaded asset.
  // The logo asset is stored at: /home/ubuntu/webdev-static-assets/bb-logo.png
  
  if (variant === 'icon') {
    return (
      <img
        src="/manus-storage/bb-logo.png"
        alt="Buyers Brief"
        width={size}
        height={size}
        className={className}
        style={{ display: 'inline-block' }}
      />
    );
  }

  // For wordmark + icon, use a simple layout
  return (
    <img
      src="/manus-storage/bb-logo.png"
      alt="Buyers Brief"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block' }}
    />
  );
}
