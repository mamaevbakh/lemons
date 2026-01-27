import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardFavouritesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent("/dashboard/favourites")}`);
  }

  // TODO: Implement favourites functionality
  // For now, show empty state
  return (
    <div className="p-4">
      <Empty>
        <EmptyContent>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Heart className="h-8 w-8 text-muted-foreground" />
          </div>
        </EmptyContent>
        <EmptyHeader>
          <EmptyTitle>No favourites yet</EmptyTitle>
          <EmptyDescription>
            Save offers you like to find them easily later.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/offers">Browse offers</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
