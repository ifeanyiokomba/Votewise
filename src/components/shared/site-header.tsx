"use client";

import * as React from "react";
import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "#faq" },
];

function scrollToHash(hash: string) {
  if (!hash.startsWith("#")) return;
  const el = document.querySelector(hash);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Votewise home"
        >
          <Logo size="md" />
        </Link>

        <nav
          className="hidden items-center gap-0.5 md:flex"
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (item.href.startsWith("#")) {
                  e.preventDefault();
                  scrollToHash(item.href);
                }
              }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1.5 md:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get Started</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-6">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="flex items-center justify-between pr-6">
                <Logo size="md" />
              </div>
              <nav
                className="mt-8 flex flex-col gap-1"
                aria-label="Mobile primary"
              >
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      if (item.href.startsWith("#")) {
                        e.preventDefault();
                        scrollToHash(item.href);
                        setOpen(false);
                      }
                    }}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 pr-0">
                <SheetClose asChild>
                  <Button asChild variant="outline">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
