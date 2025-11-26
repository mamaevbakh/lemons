import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar"


export function SidebarRight({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="sticky top-0 hidden h-svh border-l lg:flex"
      collapsible="offcanvas"
      {...props}
    >
      <SidebarContent>
      </SidebarContent>
      
    </Sidebar>
  )
}
