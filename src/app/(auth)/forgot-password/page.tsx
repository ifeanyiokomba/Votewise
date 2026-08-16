"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  ArrowLeft,
  ExternalLink,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-fetch";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [devResetUrl, setDevResetUrl] = React.useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    try {
      const res = await apiFetch<{ requested: boolean; devResetUrl?: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify(values),
        }
      );
      // Anti-enumeration: always show success regardless of response.
      setDone(true);
      if (res.success && res.data?.devResetUrl) {
        setDevResetUrl(res.data.devResetUrl);
      }
      toast.success("Reset link sent", {
        description: "Check your inbox for the password reset link.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="border-border/70 shadow-glow">
        <CardHeader className="items-center text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Check your email
          </CardTitle>
          <CardDescription className="text-center">
            If an account exists for that email, a reset link has been sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {devResetUrl && (
            <Alert className="border-warning/40 bg-warning/10">
              <FlaskConical className="size-4 text-warning" />
              <AlertTitle className="text-warning-foreground">
                Dev mode: reset link
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2 text-xs">
                  Email delivery is disabled in development. Use the link below
                  to complete the reset flow.
                </p>
                <a
                  href={devResetUrl}
                  className="inline-flex items-center gap-1.5 rounded-md bg-warning/15 px-2.5 py-1.5 font-mono text-xs font-medium text-warning-foreground underline-offset-4 hover:underline"
                >
                  Open reset link
                  <ExternalLink className="size-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}
          <p className="text-center text-xs text-muted-foreground">
            The link expires in 30 minutes. Remember to check your spam folder.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </a>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-glow">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Reset your password
        </CardTitle>
        <CardDescription>
          Enter the email associated with your Votewise account and we&apos;ll
          send you a secure reset link.
        </CardDescription>
      </CardHeader>

      <CardContent>
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

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Sending link…" : "Send reset link"}
            </Button>
          </form>
        </Form>

        <noscript>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="size-4" />
            <AlertDescription>
              JavaScript is required to submit this form.
            </AlertDescription>
          </Alert>
        </noscript>
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
