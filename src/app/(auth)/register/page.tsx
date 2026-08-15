"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  AlertCircle,
  Building2,
  Mail,
  User,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-fetch";
import { registerSchema, type RegisterInput } from "@/lib/validators";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/shared/password-input";
import {
  PasswordStrengthMeter,
  PasswordRequirements,
} from "@/components/shared/password-strength";

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      organizationName: "",
    },
    mode: "onBlur",
  });

  const password = form.watch("password");

  async function onSubmit(values: RegisterInput) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ user: { id: string } }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify(values),
        }
      );
      if (!res.success || !res.data) {
        const message =
          res.error?.message ?? "Could not create your account. Try again.";
        setError(message);
        toast.error("Registration failed", { description: message });
        return;
      }
      toast.success("Account created", {
        description: "Welcome to Votewise. Redirecting to your dashboard…",
      });
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-border/70 shadow-glow">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create your organization account
        </CardTitle>
        <CardDescription>
          Run secure, transparent elections for your members in minutes.
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        autoComplete="name"
                        placeholder="Ada Okonkwo"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work email</FormLabel>
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
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        placeholder="Create a strong password"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <PasswordStrengthMeter password={password ?? ""} />
                  <PasswordRequirements password={password ?? ""} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization name</FormLabel>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        autoComplete="organization"
                        placeholder="Nnamdi Azikiwe University"
                        className="pl-9"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </Form>

        <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Check className="mt-0.5 size-3 shrink-0 text-success" />
          By continuing you agree to the Votewise{" "}
          <a
            href="/terms"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </CardContent>

      <Separator className="bg-border/70" />

      <CardFooter className="justify-center pt-2 text-sm">
        <span className="text-muted-foreground">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </a>
        </span>
      </CardFooter>
    </Card>
  );
}
