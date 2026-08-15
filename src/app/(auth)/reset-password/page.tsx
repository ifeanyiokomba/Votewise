"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Link2Off,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-fetch";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validators";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordStrengthMeter } from "@/components/shared/password-strength";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetSkeleton() {
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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token ?? "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const password = form.watch("password");

  // No token = invalid link state.
  if (!token) {
    return (
      <Card className="border-border/70 shadow-glow">
        <CardHeader className="items-center text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <Link2Off className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Invalid reset link
          </CardTitle>
          <CardDescription className="text-center">
            This reset link is missing a valid token. Please request a new
            password reset.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <a
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Request a new link
          </a>
        </CardFooter>
      </Card>
    );
  }

  async function onSubmit(values: ResetPasswordInput) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ reset: boolean }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: values.token,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });
      if (!res.success || !res.data) {
        const message =
          res.error?.message ?? "Could not reset password. Please try again.";
        setError(message);
        toast.error("Reset failed", { description: message });
        return;
      }
      setSuccess(true);
      toast.success("Password reset", {
        description: "You can now sign in with your new password.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card className="border-border/70 shadow-glow">
        <CardHeader className="items-center text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Password updated
          </CardTitle>
          <CardDescription className="text-center">
            Your password has been reset successfully. You can now sign in with
            your new credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-success/40 bg-success/5">
            <Lock className="size-4 text-success" />
            <AlertDescription className="text-success-foreground">
              For your security, this reset link is now single-use and can no
              longer be used.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="justify-center">
          <Button size="lg" onClick={() => router.push("/login")}>
            Continue to login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-glow">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Set a new password
        </CardTitle>
        <CardDescription>
          Choose a strong password you don&apos;t use anywhere else.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertTitle>Could not reset password</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* hidden token carrier */}
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      {...field}
                    />
                  </FormControl>
                  <PasswordStrengthMeter password={password ?? ""} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      {...field}
                    />
                  </FormControl>
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
              {submitting ? "Resetting password…" : "Reset password"}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="justify-center text-sm">
        <a
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </a>
      </CardFooter>
    </Card>
  );
}
