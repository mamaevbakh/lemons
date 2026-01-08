"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "CA", name: "Canada" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GI", name: "Gibraltar" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong SAR China" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "LV", name: "Latvia" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "MX", name: "Mexico" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TH", name: "Thailand" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
];

type StripeCountryPickerProps = {
  initialCountry: string | null;
  locked?: boolean;
};

export function StripeCountryPicker({
  initialCountry,
  locked,
}: StripeCountryPickerProps) {
  const normalizedInitial = initialCountry ? initialCountry.toUpperCase() : null;
  const [country, setCountry] = useState<string | undefined>(
    normalizedInitial ?? undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLabel = useMemo(() => {
    const found = COUNTRIES.find((c) => c.code === country);
    return found?.name ?? null;
  }, [country]);

  async function save() {
    if (!country) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/profile/country", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save country");
      }

      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  async function resetOnboarding() {
    setIsResetting(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/connect/reset", {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to reset onboarding");
      }

      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={country} onValueChange={setCountry} disabled={Boolean(locked)}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Select your country">{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {locked ? (
          <Button
            variant="secondary"
            onClick={resetOnboarding}
            disabled={isResetting}
          >
            {isResetting ? "Resetting..." : "Start new onboarding"}
          </Button>
        ) : (
          <Button variant="secondary" onClick={save} disabled={!country || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {locked
          ? "Country is locked after you start onboarding. To change it, start new onboarding (this creates a new Stripe connected account)."
          : "Stripe uses this to set your connected account country. It can’t be changed after the account is created."}
      </p>
      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
