"use client";

import {
  Twitter,
  Linkedin,
  Github,
  Instagram,
  Youtube,
  Facebook,
  Globe,
  type LucideIcon,
} from "lucide-react";

interface SocialLinkCardProps {
  platform: string;
  url: string;
}

const PLATFORM_CONFIG: Record<
  string,
  { icon: LucideIcon; extractHandle: (url: string) => string | null }
> = {
  twitter: {
    icon: Twitter,
    extractHandle: (url) => {
      const match = url.match(/(?:twitter\.com|x\.com)\/(@?\w+)/i);
      return match ? `@${match[1].replace("@", "")}` : null;
    },
  },
  x: {
    icon: Twitter,
    extractHandle: (url) => {
      const match = url.match(/(?:twitter\.com|x\.com)\/(@?\w+)/i);
      return match ? `@${match[1].replace("@", "")}` : null;
    },
  },
  linkedin: {
    icon: Linkedin,
    extractHandle: (url) => {
      const match = url.match(/linkedin\.com\/(?:in|company)\/([^/?]+)/i);
      return match ? match[1] : null;
    },
  },
  github: {
    icon: Github,
    extractHandle: (url) => {
      const match = url.match(/github\.com\/([^/?]+)/i);
      return match ? `@${match[1]}` : null;
    },
  },
  instagram: {
    icon: Instagram,
    extractHandle: (url) => {
      const match = url.match(/instagram\.com\/([^/?]+)/i);
      return match ? `@${match[1]}` : null;
    },
  },
  youtube: {
    icon: Youtube,
    extractHandle: (url) => {
      const match = url.match(/youtube\.com\/(?:@|c\/|channel\/|user\/)?([^/?]+)/i);
      return match ? match[1] : null;
    },
  },
  tiktok: {
    icon: Globe, // Lucide doesn't have TikTok
    extractHandle: (url) => {
      const match = url.match(/tiktok\.com\/@?([^/?]+)/i);
      return match ? `@${match[1].replace("@", "")}` : null;
    },
  },
  facebook: {
    icon: Facebook,
    extractHandle: (url) => {
      const match = url.match(/facebook\.com\/([^/?]+)/i);
      return match ? match[1] : null;
    },
  },
  dribbble: {
    icon: Globe, // Lucide doesn't have Dribbble
    extractHandle: (url) => {
      const match = url.match(/dribbble\.com\/([^/?]+)/i);
      return match ? match[1] : null;
    },
  },
  behance: {
    icon: Globe, // Lucide doesn't have Behance
    extractHandle: (url) => {
      const match = url.match(/behance\.net\/([^/?]+)/i);
      return match ? match[1] : null;
    },
  },
};

function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function SocialLinkCard({ platform, url }: SocialLinkCardProps) {
  const platformKey = platform.toLowerCase();
  const config = PLATFORM_CONFIG[platformKey];
  
  const Icon = config?.icon ?? Globe;
  const handle = config?.extractHandle(url) ?? getDomain(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm transition hover:border-primary/60 hover:shadow-sm"
    >
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="font-medium capitalize">{platform}</div>
        <div className="text-xs text-muted-foreground truncate">{handle}</div>
      </div>
    </a>
  );
}
