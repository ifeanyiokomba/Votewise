import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function Logo({
  size = "md",
  className,
  showText = true,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}) {
  const dims = {
    sm: { box: "h-7 w-7", text: "text-base", icon: 15 },
    md: { box: "h-9 w-9", text: "text-lg", icon: 19 },
    lg: { box: "h-12 w-12", text: "text-2xl", icon: 26 },
  }[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative grid place-items-center rounded-xl shadow-sm",
          dims.box,
          "bg-gradient-to-br from-primary via-primary to-chart-3 text-primary-foreground"
        )}
      >
        {/* Distinctive Votewise mark: abstract ballot/checkmark hybrid */}
        <svg
          width={dims.icon}
          height={dims.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Stylized "V" mark formed by two converging lines + check */}
          <path
            d="M4 5.5 L12 20 L20 5.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Checkmark inside the V — represents verified voting */}
          <path
            d="M8.5 11 L11 13.5 L15.5 8.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
        </svg>
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight", dims.text)}>
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
