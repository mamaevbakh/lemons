import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser } from "./nav-user"


// This is sample data.
export const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  }
}

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0" {...props}>

      <SidebarContent>
       
      </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} /> 
        </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
