import Image from "next/image"

import { cn } from "@/lib/utils"

type LemonsLogoProps = {
  className?: string
  alt?: string
  width?: number
  height?: number
  priority?: boolean
}

export function LemonsLogo({
  className,
  alt = "Lemons",
  width = 140,
  height = 32,
  priority = false,
}: LemonsLogoProps) {
  return (
    <>
      <Image
        src="/lemons-logo-light.svg"
        alt={alt}
        width={width}
        height={height}
        className={cn(className, "dark:hidden")}
        priority={priority}
      />
      <Image
        src="/lemons-logo-dark.svg"
        alt={alt}
        width={width}
        height={height}
        className={cn(className, "hidden dark:block")}
        priority={priority}
      />
    </>
  )
}
