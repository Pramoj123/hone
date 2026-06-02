import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

interface GymAvatarProps {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function GymAvatar({ name, logoUrl, primaryColor, size = "md", className }: GymAvatarProps): React.JSX.Element {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn("rounded-lg object-cover flex-shrink-0", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center font-semibold flex-shrink-0",
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: primaryColor ?? "#111827", color: "#ffffff" }}
    >
      {initials}
    </div>
  );
}
