import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Votewise — Secure Election Management for Organizations",
    template: "%s · Votewise",
  },
  description:
    "Conduct secure, transparent elections for universities, unions, associations, cooperatives and organizations. Voter verification, real-time monitoring and auditable results.",
  keywords: [
    "Votewise",
    "elections",
    "voting platform",
    "election management",
    "secure voting",
    "organization elections",
    "university elections",
  ],
  authors: [{ name: "Votewise" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Votewise — Secure Election Management",
    description:
      "Secure, transparent election management platform for organizations.",
    siteName: "Votewise",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Votewise",
    description: "Secure election management for organizations.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme class before React hydrates to prevent Radix ID mismatch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("votewise-theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-x-hidden`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
          <Sonner richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
