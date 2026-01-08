// app/dashboard/layout.tsx
import { SidebarLeft } from "@/components/sidebar-left"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

import { Suspense } from "react"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

import { Separator } from "@/components/ui/separator"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <DashboardAuthedLayout>{children}</DashboardAuthedLayout>
    </Suspense>
  )
}

async function DashboardAuthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user ?? null

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent("/dashboard")}`)
  }

  const name =
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    user.email ||
    "Account"
  const email = user.email ?? ""
  const avatar =
    (typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url) ||
    (typeof user.user_metadata?.picture === "string" && user.user_metadata.picture) ||
    ""

  return (
    <SidebarProvider>
      <SidebarLeft user={{ name, email, avatar }} />

      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger />

          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">
                  Dashboard
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex flex-1 flex-col gap-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
