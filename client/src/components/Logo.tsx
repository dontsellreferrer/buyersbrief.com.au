/**
 * Logo Component — Official Buyers Brief wordmark logo
 * Uses the SVG (colour) version on light backgrounds (nav on homepage)
 * Uses the white PNG version on dark backgrounds (footer, brief page nav)
 * 
 * Per Brand Bible v1.0:
 * - Primary colour logo on off-white, white, or very light backgrounds
 * - White logo on charcoal (#1E1E1E), dark navy, or any dark background
 */

interface LogoProps {
  size?: "nav" | "footer";
  variant?: "light" | "dark"; // light = colour logo on light bg, dark = white logo on dark bg
}

export function Logo({ size = "nav", variant }: LogoProps) {
  const isFooter = size === "footer";
  
  // Determine which logo to use:
  // - If variant is explicitly set, use that
  // - Otherwise, footer defaults to dark (white logo), nav defaults to light (colour logo)
  const useDarkVariant = variant === "dark" || (!variant && isFooter);
  
  const src = useDarkVariant ? "/bb-logo-white.webp" : "/bb-logo.svg";
  
  // The SVG has a tight viewBox (650x165) so height maps well to visible content.
  // The webp is 1330x330 with content at 1290x290 — aspect ratio ~4.4:1
  // At height=36px the webp renders ~158px wide which is good for nav.
  // For footer, slightly smaller is fine.
  const height = isFooter ? 36 : 40;

  return (
    <a href="/" className="flex items-center no-underline">
      <img
        src={src}
        alt="buyersbrief.com.au"
        style={{
          height: `${height}px`,
          width: 'auto',
          display: 'block',
        }}
      />
    </a>
  );
}

export default Logo;
