/**
 * BB Icon Component — matches the prototype's custom document+pin icon
 * Used throughout the site at various sizes.
 */

interface BBIconProps {
  /** Width of the document part in px */
  docWidth?: number;
  /** Height of the document part in px */
  docHeight?: number;
  /** Width of the pin circle in px */
  pinSize?: number;
  /** Width of the inner pin dot in px */
  pinInnerSize?: number;
  className?: string;
}

export function BBIcon({
  docWidth = 18,
  docHeight = 23,
  pinSize = 9,
  pinInnerSize = 4,
  className = "",
}: BBIconProps) {
  return (
    <span className={`bb-icon ${className}`}>
      <span
        className="doc"
        style={{ width: docWidth, height: docHeight }}
      >
        <span className="doc-lines">
          <span className="doc-line" />
          <span className="doc-line" />
          <span className="doc-line" />
          <span className="doc-line" />
        </span>
      </span>
      <span
        className="pin"
        style={{ width: pinSize, height: pinSize }}
      >
        <span
          className="pin-inner"
          style={{ width: pinInnerSize, height: pinInnerSize }}
        />
      </span>
    </span>
  );
}

export default BBIcon;
