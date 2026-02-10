import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "LemonsLemons",
  description: "freelancers selling productized services, companies promoting their tools, and clients getting matched to both based on their actual needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      
      <body
        className={`${GeistSans.variable} font-sans antialiased`}
      ><ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
        {children}
      {/* Place system-level, independent components here */}
      </ThemeProvider>
      <Analytics />
      </body>
    </html>
  );
}
