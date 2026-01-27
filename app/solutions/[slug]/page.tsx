import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CaseThumbnail } from "@/components/solutions/case-thumbnail";
import { SocialLinkCard } from "@/components/solutions/social-link-card";
import { PortfolioGrid } from "@/components/solutions/portfolio-grid";
import {
  SolutionPageContent,
  AnimatedHeader,
  AnimatedSection,
} from "@/components/solutions/animated-page";

type Solution = Tables<"solutions">;
type SolutionLinkRow = Tables<"solution_links">;
type PricingRow = Tables<"solution_pricing_items">;
type CaseLinkRow = Tables<"solution_case_links">;
type CaseRow = Tables<"cases">;
type OfferRow = Tables<"offers">;

type RouteParams = {
  slug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: solution } = await supabase
    .from("solutions")
    .select("id, title, headline, description")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<Pick<Solution, "id" | "title" | "headline" | "description">>();

  if (!solution) {
    return { title: "Solution not found" };
  }

  const { data: mediaRoles } = await supabase
    .from("solution_media")
    .select("role")
    .eq("solution_id", solution.id);

  const hasCover = (mediaRoles ?? []).some((m) => m.role === "cover");
  const coverUrl = hasCover
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/solutions/${solution.id}/media/cover?redirect=1`
    : undefined;

  const description = solution.headline || solution.description?.slice(0, 160) || "";

  return {
    title: solution.title,
    description,
    openGraph: {
      title: solution.title,
      description,
      type: "website",
      images: coverUrl ? [{ url: coverUrl, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: solution.title,
      description,
      images: coverUrl ? [coverUrl] : [],
    },
  };
}

export default async function SolutionPublicPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: solution, error: solutionError } = await supabase
    .from("solutions")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<Solution>();

  if (solutionError || !solution) {
    notFound();
  }

  const { data: mediaRoles } = await supabase
    .from("solution_media")
    .select("role")
    .eq("solution_id", solution.id);

  const hasLogo = (mediaRoles ?? []).some((m) => m.role === "logo");
  const hasCover = (mediaRoles ?? []).some((m) => m.role === "cover");
  const hasReel = (mediaRoles ?? []).some((m) => m.role === "reel");

  const { data: links } = await supabase
    .from("solution_links")
    .select("*")
    .eq("solution_id", solution.id)
    .order("position", { ascending: true });

  const { data: pricing } = await supabase
    .from("solution_pricing_items")
    .select("*")
    .eq("solution_id", solution.id)
    .order("position", { ascending: true });

  const { data: caseLinks } = await supabase
    .from("solution_case_links")
    .select("*")
    .eq("solution_id", solution.id)
    .order("position", { ascending: true });

  const caseIds = (caseLinks ?? []).map((c) => c.case_id);
  const { data: cases } = caseIds.length
    ? await supabase
        .from("cases")
        .select("id, title, summary, problem, solution, result")
        .in("id", caseIds)
    : { data: [] as CaseRow[] };

  const caseById = new Map((cases ?? []).map((c) => [c.id, c]));
  const orderedCases = (caseLinks ?? [])
    .map((cl) => caseById.get(cl.case_id))
    .filter(Boolean) as CaseRow[];

  const featuredOfferIds = solution.featured_offer_ids ?? [];
  const { data: offers } = featuredOfferIds.length
    ? await supabase
        .from("offers")
        .select("id, title, description, slug, offer_status")
        .in("id", featuredOfferIds)
    : { data: [] as OfferRow[] };

  const offersById = new Map((offers ?? []).map((o) => [o.id, o]));
  const orderedOffers = featuredOfferIds
    .map((id) => offersById.get(id))
    .filter((o): o is OfferRow => o !== undefined && o.offer_status === "active");

  const logoSrc = hasLogo
    ? `/api/solutions/${solution.id}/media/logo?redirect=1`
    : null;
  const coverSrc = hasCover
    ? `/api/solutions/${solution.id}/media/cover?redirect=1`
    : null;
  const reelSrc = hasReel
    ? `/api/solutions/${solution.id}/media/reel?redirect=1`
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <SolutionPageContent>
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/offers">Solutions</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{solution.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* LinkedIn-style header */}
      <AnimatedHeader className="overflow-hidden rounded-xl border bg-card">
        <div className="relative">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt="Cover"
              className="h-44 w-full object-cover sm:h-56"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="h-44 w-full bg-muted sm:h-56" />
          )}

          <div className="absolute -bottom-8 left-6">
            <div className="h-20 w-20 overflow-hidden rounded-xl border bg-background">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={`${solution.title} logo`}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Logo
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {solution.title}
              </h1>
              {solution.headline ? (
                <p className="mt-1 text-muted-foreground sm:text-lg">
                  {solution.headline}
                </p>
              ) : null}
            </div>

            {solution.website_url ? (
              <Button variant="outline" asChild>
                <a href={solution.website_url} target="_blank" rel="noreferrer">
                  Visit website
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </AnimatedHeader>

      {/* About */}
      <AnimatedSection className="mt-12 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <h2 className="text-lg font-semibold">About</h2>
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground leading-relaxed">
            {solution.description ?? ""}
          </p>
        </div>

        <div>
          {reelSrc ? (
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Intro video</h2>
              <div className="mt-3 w-full overflow-hidden rounded-xl border bg-muted">
                <div className="aspect-9/16">
                  <video
                    src={reelSrc}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {(links ?? []).length > 0 && (
            <>
              <h2 className="text-lg font-semibold">Social</h2>
              <div className="mt-3 space-y-2">
                {(links as SolutionLinkRow[]).map((l) => (
                  <SocialLinkCard
                    key={l.id}
                    platform={l.platform}
                    url={l.url}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </AnimatedSection>

      {/* Pricing */}
      {(pricing ?? []).length > 0 && (
        <AnimatedSection className="mt-12">
          <h2 className="text-lg font-semibold">Pricing</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(pricing as PricingRow[]).map((p) => (
              <Card key={p.id} className="flex flex-col p-5 transition-shadow hover:shadow-md">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">{p.title}</div>
                  <div className="mt-1 text-3xl font-bold tracking-tight">
                    {p.price_text}
                  </div>
                </div>

                <p className="mt-4 flex-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {p.description ?? ""}
                </p>

                {p.cta_url ? (
                  <div className="mt-6">
                    <Button asChild className="w-full">
                      <a href={p.cta_url} target="_blank" rel="noreferrer">
                        {p.cta_label || "Get started"}
                      </a>
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </AnimatedSection>
      )}

      {/* Featured offers */}
      {orderedOffers.length > 0 && (
        <AnimatedSection className="mt-12">
          <h2 className="text-lg font-semibold">Featured offers</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {orderedOffers.map((o) => (
              <Link
                key={o.id}
                href={`/${o.slug}`}
                className="rounded-xl border bg-card p-5 transition-all hover:border-primary/60 hover:shadow-md"
              >
                <div className="font-medium line-clamp-1">{o.title}</div>
                <p className="mt-2 text-muted-foreground line-clamp-2">
                  {o.description ?? "No description yet."}
                </p>
              </Link>
            ))}
          </div>
        </AnimatedSection>
      )}

      {/* Portfolio */}
      {/* Portfolio */}
      {orderedCases.length > 0 && (
        <AnimatedSection className="mt-12">
          <h2 className="text-lg font-semibold">Portfolio</h2>
          <PortfolioGrid cases={orderedCases} solutionId={solution.id} />
        </AnimatedSection>
      )}

      {/* Footer CTA */}
      <AnimatedSection className="mt-16 rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Work with {solution.title}</h2>
            <p className="mt-1 text-muted-foreground">
              Ready to start? Reach out and let’s talk.
            </p>
          </div>
          {solution.website_url ? (
            <Button asChild>
              <a href={solution.website_url} target="_blank" rel="noreferrer">
                Get in touch
              </a>
            </Button>
          ) : null}
        </div>
      </AnimatedSection>
      </SolutionPageContent>
    </div>
  );
}
