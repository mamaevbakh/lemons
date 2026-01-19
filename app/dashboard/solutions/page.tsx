import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSolutionAction } from "./create-actions";

export default async function SolutionsPage() {
  const supabase = await createClient();

  const { data: solutions, error } = await supabase
    .from("solutions")
    .select(
      "id, title, headline, description, status, slug, website_url, created_at, updated_at, published_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">
        Failed to load solutions.
      </div>
    );
  }

  if (!solutions || solutions.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Your solutions</h1>
          <form action={createSolutionAction}>
            <Button type="submit">Create solution</Button>
          </form>
        </div>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any solutions yet. Create your first one to get
          started.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your solutions</h1>
        <form action={createSolutionAction}>
          <Button type="submit">Create solution</Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {solutions.map((solution) => (
          <Link
            key={solution.id}
            href={`/dashboard/solutions/${solution.id}`}
            className="group"
          >
            <article className="flex h-full flex-col rounded-xl border bg-card p-4 transition hover:border-primary/60 hover:shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="line-clamp-1 text-sm font-medium">
                  {solution.title}
                </h2>
                <Badge
                  variant={
                    solution.status === "published"
                      ? "default"
                      : solution.status === "archived"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {solution.status === "published"
                    ? "Published"
                    : solution.status === "archived"
                      ? "Archived"
                      : "Draft"}
                </Badge>
              </div>

              <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                {solution.headline ?? "No headline yet."}
              </p>

              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {solution.description ?? "No description yet."}
              </p>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="line-clamp-1">/{solution.slug}</span>
                <span>
                  {solution.created_at
                    ? new Date(solution.created_at).toLocaleDateString()
                    : ""}
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
