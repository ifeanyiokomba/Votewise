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
          "relative grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm",
          dims.box
        )}
      >
        <svg
          width={dims.icon}
          height={dims.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 2.5 20 6v5.5c0 4.6-3.2 8.8-8 10-4.8-1.2-8-5.4-8-10V6l8-3.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.12"
          />
          <path
            d="m9 12 2 2 4-4.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
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
