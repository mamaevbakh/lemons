import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Tables } from "@/lib/supabase/types";

export type OfferWithRelations = Tables<"offers"> & {
  categories: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

interface OfferCardProps {
  offer: OfferWithRelations;
  // Optional override if you want to reuse this card on public pages
  hrefOverride?: string;
}

export function OfferCard({ offer, hrefOverride }: OfferCardProps) {
  const href = hrefOverride ?? `/${offer.slug}`;

  const authorName = offer.profiles?.full_name?.trim() || "Anonymous";
  const avatarFallback =
    authorName && authorName.length > 0
      ? authorName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "??";

  const createdAtLabel = formatDistanceToNow(new Date(offer.created_at), {
    addSuffix: true,
  });

  const tags = offer.tags ?? [];

  const currencyCode = offer.currency_code || "EUR";
  const startingPrice =
    typeof offer.starting_price_cents === "number"
      ? offer.starting_price_cents / 100
      : 0;

  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full flex flex-col overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-2 mb-2">
            {offer.categories && (
              <Badge variant="outline" className="text-xs font-normal">
                {offer.categories.name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {createdAtLabel}
            </span>
          </div>

          <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
            {offer.title || "Untitled offer"}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 pt-2 grow">
          {offer.description ? (
            <CardDescription className="line-clamp-3 mb-4">
              {offer.description}
            </CardDescription>
          ) : (
            <CardDescription className="mb-4 text-xs text-muted-foreground">
              No description yet. Click to edit this offer.
            </CardDescription>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0 mt-auto border-t bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {authorName}
            </span>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Starting at</p>
            <p className="font-bold text-lg leading-tight">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: currencyCode,
              }).format(startingPrice)}
            </p>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
