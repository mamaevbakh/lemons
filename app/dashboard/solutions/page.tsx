import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSolutionAction } from "./create-actions";
import { GatedCreateButton } from "@/components/gated-create-button";
import { Eye, Pencil } from "lucide-react";

export default async function SolutionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: solutions, error }, { data: canCreate }] = await Promise.all([
    supabase
      .from("solutions")
      .select(
        "id, title, headline, description, status, slug, website_url, created_at, updated_at, published_at",
      )
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("can_create_solution", { user_id: user!.id }),
  ]);

  const canCreateEffective =
    (canCreate ?? false) || (solutions?.length ?? 0) === 0;

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
          <GatedCreateButton canCreate={canCreateEffective} entityType="solution" createAction={createSolutionAction}>
            Create solution
          </GatedCreateButton>
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
        <GatedCreateButton canCreate={canCreateEffective} entityType="solution" createAction={createSolutionAction}>
          Create solution
        </GatedCreateButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {solutions.map((solution) => (
          <article
            key={solution.id}
            className="group flex h-full flex-col rounded-xl border bg-card p-4 transition hover:border-primary/60 hover:shadow-sm"
          >
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

            <p className="mt-2 line-clamp-2 flex-1 text-xs text-muted-foreground">
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

            <div className="mt-4 flex items-center gap-2 pt-3 border-t">
              {solution.slug && solution.status === "published" ? (
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/solutions/${solution.slug}`} target="_blank">
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Preview
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="flex-1" disabled>
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Preview
                </Button>
              )}
              <Button variant="default" size="sm" className="flex-1" asChild>
                <Link href={`/dashboard/solutions/${solution.id}`}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
