import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

/* ── types ── */

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
type AvatarVariant = "round" | "square"
type AvatarStatus = "active" | "inactive"

export interface PlayerAvatarProps {
  name: string
  src?: string
  size?: AvatarSize
  variant?: AvatarVariant
  status?: AvatarStatus
  className?: string
}

/* ── size maps ── */

const sizeClass: Record<AvatarSize, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-20",
  "2xl": "size-24",
}

const textSizeClass: Record<AvatarSize, string> = {
  xs: "text-[9px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
  "2xl": "text-2xl",
}

/* ── helpers ── */

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

/* ── component ── */

export function PlayerAvatar({
  name,
  src,
  size = "md",
  variant = "round",
  status,
  className,
}: PlayerAvatarProps) {
  const isSquare = variant === "square"
  const roundOverride = isSquare
    ? "rounded-lg after:rounded-lg"
    : undefined

  return (
    <Avatar
      className={cn(sizeClass[size], roundOverride, className)}
    >
      {src && (
        <AvatarImage
          src={src}
          alt={name}
          className={cn(isSquare && "rounded-lg")}
        />
      )}
      <AvatarFallback
        className={cn(
          "bg-primary text-primary-foreground font-semibold",
          textSizeClass[size],
          isSquare && "rounded-lg"
        )}
      >
        {getInitials(name)}
      </AvatarFallback>

      {status && (
        <AvatarBadge
          className={cn(
            status === "active" && "bg-success ring-background",
            status === "inactive" && "bg-muted-foreground ring-background"
          )}
        />
      )}
    </Avatar>
  )
}

/* ── re-export group primitives for convenience ── */

export { AvatarGroup, AvatarGroupCount }
