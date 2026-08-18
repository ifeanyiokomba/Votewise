import Link from "next/link";
import { Twitter, Linkedin, Facebook, Github, Mail } from "lucide-react";

import { Logo } from "@/components/shared/logo";

type FooterColumn = {
  title: string;
  links: { label: string; href: string }[];
};

const COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Security", href: "/#security" },
      { label: "Pricing", href: "/pricing" },
      { label: "Real-time monitoring", href: "/#monitoring" },
      { label: "Analytics", href: "/#analytics" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "Contact", href: "/support" },
      { label: "Book a demo", href: "/support" },
      { label: "Careers", href: "/#about" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/#faq" },
      { label: "Support center", href: "/support" },
      { label: "FAQ", href: "/#faq" },
      { label: "System status", href: "/#monitoring" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/#legal" },
      { label: "Terms of service", href: "/#legal" },
      { label: "Data residency", href: "/#legal" },
      { label: "GDPR & NDPR", href: "/#legal" },
    ],
  },
];

const SOCIAL = [
  { label: "X (Twitter)", href: "https://x.com/okombaifeanyi", Icon: Twitter },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/okombaifeanyi", Icon: Linkedin },
  { label: "Facebook", href: "https://web.facebook.com/okombaifeanyi", Icon: Facebook },
  { label: "GitHub", href: "https://github.com/ifeanyiokomba/", Icon: Github },
  { label: "Email", href: "mailto:support@votewise.com.ng", Icon: Mail },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Secure, transparent election management for organizations worldwide —
              from student unions to corporate boards.
            </p>
            <div className="mt-5 flex items-center gap-1.5">
              {SOCIAL.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold tracking-tight">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Votewise — A product of{" "}
            <a href="https://okomba.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Okomba Analytics</a>.
            <span className="ml-1">Built for organizations across Africa and beyond.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
