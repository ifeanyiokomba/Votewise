"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { loginSchema, type LoginInput } from "@/lib/validators";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
    password: "Admin@12345",
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [demoOpen, setDemoOpen] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: LoginInput) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ user: { id: string; role: string; organizationId: string | null } }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(values),
        }
      );
      if (!res.success || !res.data) {
        const message =
          res.error?.message ?? "Could not sign in. Please try again.";
        setError(message);
        toast.error("Sign-in failed", { description: message });
        return;
      }
      toast.success("Welcome back!", {
        description: "You're now signed in to Votewise.",
      });
      const next = searchParams.get("next");
      // Use hard navigation to ensure the session cookie is properly
      // propagated to the server on the next request. Client-side router
      // navigation (router.push) can race with cookie propagation.
      const target = next && next.startsWith("/") ? next : "/dashboard";
      window.location.href = target;
    } finally {
      setSubmitting(false);
    }
  }

  function quickFill() {
    const owner = DEMO_ACCOUNTS[0];
    form.setValue("email", owner.email, { shouldValidate: true });
    form.setValue("password", owner.password, { shouldValidate: true });
    void form.handleSubmit(onSubmit)();
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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@organization.org"
                        className="pl-9"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <a
                      href="/forgot-password"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <PasswordInput
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="pl-9"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        </Form>

        <div className="mt-6">
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

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
