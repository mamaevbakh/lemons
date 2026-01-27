import { User, Building2, ArrowRight, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createOfferAction } from "./offers/create-actions";
import { createSolutionAction } from "./solutions/create-actions";

export default function DashboardHome() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Welcome header */}
      <div className="mb-8 text-center">
        <Badge variant="secondary" className="mb-4">
          <Sparkles className="mr-1.5 h-3 w-3" />
          Get started
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          What would you like to create?
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Choose the option that best describes what you want to offer. You can always create more later.
        </p>
      </div>

      {/* Onboarding cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Freelancer / Solo Expert */}
        <form action={createOfferAction} className="group">
          <button type="submit" className="w-full text-left">
            <Card className="h-full transition-all hover:border-primary hover:shadow-lg cursor-pointer">
              <CardHeader className="pb-4">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border bg-muted transition-transform group-hover:scale-110">
                  <User className="h-7 w-7" />
                </div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  Sell my own work
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </CardTitle>
                <CardDescription className="text-base">
                  Freelancer or solo expert
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
                    Offer your skills and expertise directly to clients
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
                    Create service packages with custom pricing
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
                    Showcase your portfolio and case studies
                  </li>
                </ul>
              </CardContent>
            </Card>
          </button>
        </form>

        {/* Company / Team */}
        <form action={createSolutionAction} className="group">
          <button type="submit" className="w-full text-left">
            <Card className="h-full transition-all hover:border-primary hover:shadow-lg cursor-pointer">
              <CardHeader className="pb-4">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border bg-muted transition-transform group-hover:scale-110">
                  <Building2 className="h-7 w-7" />
                </div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  Offer a solution
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </CardTitle>
                <CardDescription className="text-base">
                  Product, tool, or team-based solution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
                    Present your company&apos;s products or services
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
                    Build a professional solution page
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/40 shrink-0" />
                    Feature your team and customer success stories
                  </li>
                </ul>
              </CardContent>
            </Card>
          </button>
        </form>
      </div>

      {/* Help text */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Not sure which to choose?{" "}
        <span className="font-medium text-foreground">Offers</span> are for individual services,{" "}
        <span className="font-medium text-foreground">Solutions</span> are for company pages.
      </p>
    </div>
  );
}
