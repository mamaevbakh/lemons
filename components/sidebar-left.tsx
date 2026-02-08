import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import {
  Home,
  Tag,
  ShoppingCart,
  Wallet,
  BadgeDollarSign,
  Sparkles,
  Heart,
  Crown,
} from "lucide-react"
import { NavUser } from "./nav-user"
import { Badge } from "@/components/ui/badge"

type SidebarLeftUser = {
  name: string
  email: string
  avatar?: string
}

const tierConfig = {
  free: { label: "Free", variant: "secondary" as const },
  pro: { label: "Pro", variant: "default" as const },
  business: { label: "Business", variant: "default" as const },
}

export function SidebarLeft({
  user,
  subscriptionTier = "free",
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: SidebarLeftUser
  subscriptionTier?: string
}) {
  const tier = tierConfig[subscriptionTier as keyof typeof tierConfig] ?? tierConfig.free
  return (
    <Sidebar className="border-r-0" {...props}>
      {/* Logo Placeholder */}
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30">
            <span className="text-xs text-muted-foreground">L</span>
          </div>
          <span className="font-semibold text-lg">Lemons</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Home */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <Home />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Buyer Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Buyer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/orders">
                    <ShoppingCart />
                    <span>Orders</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/favourites">
                    <Heart />
                    <span>Favourites</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Seller Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Seller</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/offers">
                    <Tag />
                    <span>Offers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/solutions">
                    <Sparkles />
                    <span>Solutions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/sales">
                    <BadgeDollarSign />
                    <span>Sales</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/payouts">
                    <Wallet />
                    <span>Payouts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Plan */}
        <SidebarGroup>
          <SidebarGroupLabel>Plan</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/billing" className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Crown />
                      <span>{tier.label}</span>
                    </span>
                    <Badge variant={tier.variant} className="text-[10px] px-1.5 py-0">
                      {subscriptionTier === "free" ? "Upgrade" : "Manage"}
                    </Badge>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
