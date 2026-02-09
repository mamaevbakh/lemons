import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Check, Zap, Shield, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CurrentYear } from "@/components/current-year";
import { PricingSection } from "@/components/pricing-section";
import { LemonsLogo } from "@/components/lemons-logo";

export default function Home() {
  return (
    <main className="min-h-screen bg-background dark:bg-black">
      {/* Navigation */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="inline-flex items-center">
            <LemonsLogo className="h-15 w-auto md:h-16" priority />
          </Link>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/offers">Browse</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6">
            Now in beta
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Buy and sell digital work like products
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Find freelancers, agencies, and tools—all packaged with clear scope and fixed pricing. No proposals. No back-and-forth. Just click and buy.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/offers">
                Browse offers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth">Start selling</Link>
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* How it works */}
      <section className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mt-4 text-muted-foreground">
            Whether you&apos;re buying or selling, the process is simple.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border text-xl font-semibold">
              1
            </div>
            <h3 className="font-semibold mb-2">Browse or create</h3>
            <p className="text-sm text-muted-foreground">
              Find what you need, or package your own skills as a product others can buy.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border text-xl font-semibold">
              2
            </div>
            <h3 className="font-semibold mb-2">Purchase instantly</h3>
            <p className="text-sm text-muted-foreground">
              Pick a package, pay securely, and get started. No negotiation required.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border text-xl font-semibold">
              3
            </div>
            <h3 className="font-semibold mb-2">Get it delivered</h3>
            <p className="text-sm text-muted-foreground">
              Receive your work on time. Request revisions if needed. Done.
            </p>
          </div>
        </div>
      </section>

      <Separator />

      {/* For buyers and sellers */}
      <section className="container mx-auto px-4 py-24">
        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>For buyers</CardTitle>
              <CardDescription>
                Stop wasting time on proposals and estimates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">Fixed prices—know exactly what you&apos;ll pay</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">Clear deliverables and timelines upfront</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">Browse portfolios and case studies</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">Secure payment with revision protection</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>For sellers</CardTitle>
              <CardDescription>
                Turn your expertise into products that sell
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">Create offers in minutes with AI assistance</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">Set your own prices and delivery terms</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">Showcase your work with rich portfolios</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">Get paid directly via Stripe</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Why Lemons */}
      <section className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">
            Why Lemons?
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-semibold mb-2">Fast</h3>
            <p className="text-sm text-muted-foreground">
              Skip the discovery calls and proposals. Buy in seconds, start immediately.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="font-semibold mb-2">Secure</h3>
            <p className="text-sm text-muted-foreground">
              Payments held until delivery. Built-in dispute resolution if things go wrong.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-semibold mb-2">Predictable</h3>
            <p className="text-sm text-muted-foreground">
              Know the price, scope, and timeline before you commit. No surprises.
            </p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Pricing */}
      <PricingSection />

      <Separator />

      {/* CTA */}
      <section className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join Lemons today. It&apos;s free to browse and create your first offer.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth">
                Create your account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © <Suspense fallback={null}><CurrentYear /></Suspense> Lemons. All rights reserved.
            </p>
            <nav className="flex gap-6">
              <Link href="/offers" className="text-sm text-muted-foreground hover:text-foreground">
                Browse
              </Link>
              <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
