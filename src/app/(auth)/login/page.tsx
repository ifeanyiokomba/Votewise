"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  ChevronDown,
  Copy,
  Check,
  Sparkles,
  Mail,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { PasswordInput } from "@/components/shared/password-input";

type DemoAccount = { label: string; email: string; password: string };

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Org Owner",
    email: "demo@votewise.com.ng",
    password: "Demo@1234",
  },
  {
    label: "Platform Admin",
    email: "admin@votewise.com.ng",
    password: "Ntaokomba91615",
  },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <Card className="border-border/70">
      <CardHeader className="gap-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded-md bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      </CardContent>
    </Card>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [demoOpen, setDemoOpen] = React.useState(false);

  // Check for error query params from redirects
  React.useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam) {
      setError("Sign-in error. Please try again.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Simple inline validation (no external library — bulletproof)
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{
        user: { id: string; role: string; organizationId: string | null };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.success || !res.data) {
        const message = res.error?.message ?? "Could not sign in. Please try again.";
        setError(message);
        toast.error("Sign-in failed", { description: message });
        return;
      }

      toast.success("Welcome back!", {
        description: "You're now signed in to Votewise.",
      });

      // Use hard navigation to ensure the session cookie is properly
      // propagated to the server on the next request.
      const next = searchParams.get("next");
      const target = next && next.startsWith("/") ? next : "/dashboard";
      window.location.href = target;
    } catch {
      setError("An unexpected error occurred. Please try again.");
      toast.error("Sign-in failed", {
        description: "An unexpected error occurred.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function quickFill() {
    const owner = DEMO_ACCOUNTS[0];
    setEmail(owner.email);
    setPassword(owner.password);
    // Submit directly — don't wait for state update
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }, 0);
  }

  return (
    <Card className="border-border/70 shadow-glow">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription>
          Sign in to manage your elections and voters.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@organization.org"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a
                href="/forgot-password"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <PasswordInput
                id="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" defaultChecked />
              <Label
                htmlFor="remember"
                className="text-sm text-muted-foreground"
              >
                Remember me
              </Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={quickFill}
              disabled={submitting}
              className="text-primary hover:text-primary"
            >
              <Sparkles className="size-3.5" />
              Quick fill
            </Button>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6">
          <Collapsible open={demoOpen} onOpenChange={setDemoOpen} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                aria-expanded={demoOpen}
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    demoOpen && "rotate-180"
                  )}
                />
                Demo accounts
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <DemoCredentialRow key={acc.email} account={acc} />
              ))}
              <p className="pt-1 text-center text-xs text-muted-foreground">
                Use <strong>Quick fill</strong> above to sign in as the org
                owner instantly.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>

      <CardFooter className="justify-center text-sm">
        <span className="text-muted-foreground">
          New to Votewise?{" "}
          <a
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an organization account
          </a>
        </span>
      </CardFooter>
    </Card>
  );
}

function DemoCredentialRow({ account }: { account: DemoAccount }) {
  const [copied, setCopied] = React.useState<"email" | "password" | null>(null);

  function copy(field: "email" | "password") {
    void navigator.clipboard.writeText(account[field]);
    setCopied(field);
    toast.success(`${field === "email" ? "Email" : "Password"} copied`, {
      description: account[field],
    });
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {account.label}
        </span>
      </div>
      <div className="mt-1.5 grid gap-1.5">
        <button
          type="button"
          onClick={() => copy("email")}
          className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-accent"
        >
          <span className="font-mono">{account.email}</span>
          {copied === "email" ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5 text-muted-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={() => copy("password")}
          className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-accent"
        >
          <span className="font-mono">{account.password}</span>
          {copied === "password" ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
