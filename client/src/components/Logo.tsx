import { BBIcon } from "./BBIcon";

interface LogoProps {
  size?: "nav" | "footer";
}

export function Logo({ size = "nav" }: LogoProps) {
  const isFooter = size === "footer";
  const fontSize = isFooter ? "text-[18px]" : "text-[20px]";
  const comauSize = isFooter ? "text-[8px]" : "text-[9px]";

  return (
    <a href="/" className="flex items-center gap-3 no-underline">
      <BBIcon
        docWidth={isFooter ? 16 : 20}
        docHeight={isFooter ? 20 : 25}
        pinSize={isFooter ? 8 : 10}
        pinInnerSize={isFooter ? 3.5 : 4.5}
      />
      <div className="flex flex-col leading-none">
        <span
          className={`font-outfit ${fontSize} font-bold tracking-[-0.5px]`}
          style={{ color: isFooter ? "#F4F1EC" : "#1E1E1E" }}
        >
          Buyers
        </span>
        <div className="flex items-baseline">
          <span
            className={`font-outfit ${fontSize} font-light tracking-[2px]`}
            style={{ color: "#4A90D9" }}
          >
            BRIEF
          </span>
          <span
            className={`font-outfit ${comauSize} font-light tracking-[1.5px] ml-0.5 self-end`}
            style={{ color: "#4A90D9" }}
          >
            .COM.AU
          </span>
        </div>
      </div>
    </a>
  );
}

export default Logo;
