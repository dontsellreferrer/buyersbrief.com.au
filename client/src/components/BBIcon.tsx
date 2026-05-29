/**
 * BB Icon Component — Official Buyers Brief logo
 * Uses the PNG asset from Brand Bible v1.0
 * Document icon + dusty rose checkmark
 * 
 * Scales cleanly at any size via docWidth/docHeight props
 */

interface BBIconProps {
  /** Width of the icon in px (scales proportionally) */
  docWidth?: number;
  /** Height of the icon in px (scales proportionally) */
  docHeight?: number;
  /** Unused — kept for backwards compatibility */
  pinSize?: number;
  /** Unused — kept for backwards compatibility */
  pinInnerSize?: number;
  className?: string;
}

export function BBIcon({
  docWidth = 24,
  docHeight = 32,
  pinSize,
  pinInnerSize,
  className = "",
}: BBIconProps) {
  // Use docWidth/docHeight as the actual display size
  // The PNG scales perfectly at any size
  const width = docWidth;
  const height = docHeight;

  return (
    <img
      src="/bb-icon.png"
      alt="Buyers Brief"
      width={width}
      height={height}
      className={className}
      style={{
        display: 'inline-block',
        objectFit: 'contain',
      }}
    />
  );
}

export default BBIcon;
