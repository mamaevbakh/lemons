import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "?";

  const parts = fullName
    .trim()
    .split(/\s+/) // split on one or more spaces
    .filter(Boolean);

  if (parts.length === 0) return "?";

  const first = parts[0].charAt(0).toUpperCase();
  const second = parts.length > 1 ? parts[1].charAt(0).toUpperCase() : "";

  return first + second;
}

