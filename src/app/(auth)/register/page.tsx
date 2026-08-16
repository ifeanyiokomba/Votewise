"use client";

import * as React from "react";
import {
  Loader2,
  AlertCircle,
  Building2,
  Mail,
  User,
  Check,
  GraduationCap,
  Users,
  Church,
  Building,
  Landmark,
  Heart,
  Trophy,
  Briefcase,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-fetch";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/shared/password-input";
import { GoogleAuthButton } from "@/components/shared/google-auth-button";
import {
  PasswordStrengthMeter,
  PasswordRequirements,
} from "@/components/shared/password-strength";

const INSTITUTION_TYPES = [
  { value: "UNIVERSITY", label: "University / Faculty", icon: GraduationCap, description: "Student union, faculty & departmental elections" },
  { value: "STUDENT_UNION", label: "Student Union", icon: Users, description: "Student union government elections" },
  { value: "PROFESSIONAL_ASSOCIATION", label: "Professional Association", icon: Briefcase, description: "Association executive elections" },
  { value: "CHURCH", label: "Church / Religious Body", icon: Church, description: "Church governance & leadership elections" },
  { value: "COOPERATIVE", label: "Cooperative Society", icon: Heart, description: "Cooperative board & management elections" },
  { value: "NGO", label: "NGO / Non-Profit", icon: Heart, description: "Board & trustee elections" },
  { value: "CORPORATE", label: "Corporate Organization", icon: Building, description: "Board & shareholder elections" },
  { value: "CLUB_SOCIETY", label: "Club / Society", icon: Trophy, description: "Club executive elections" },
  { value: "GOVERNMENT", label: "Government Institution", icon: Landmark, description: "Institutional & agency elections" },
  { value: "OTHER", label: "Other Organization", icon: Globe, description: "Custom election needs" },
];

export default function RegisterPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [organizationName, setOrganizationName] = React.useState("");
  const [preferredSubdomain, setPreferredSubdomain] = React.useState("");
  const [institutionType, setInstitutionType] = React.useState("UNIVERSITY");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Inline validation — bulletproof, no external library
    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must include at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must include at least one number.");
      return;
    }
    if (!organizationName.trim() || organizationName.trim().length < 2) {
      setError("Please enter your organization name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ user: { id: string } }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            organizationName: organizationName.trim(),
            preferredSubdomain: preferredSubdomain.trim(),
            institutionType,
          }),
        }
      );

      if (!res.success || !res.data) {
        const message = res.error?.message ?? "Could not create your account.";
        setError(message);
        toast.error("Registration failed", { description: message });
        return;
      }

      toast.success("Account created", {
        description: "Welcome to Votewise. Redirecting to your dashboard…",
      });
      // Hard navigation — guarantees cookie propagation
      window.location.href = "/dashboard";
    } catch {
      setError("An unexpected error occurred. Please try again.");
      toast.error("Registration failed", {
        description: "An unexpected error occurred.",
      });
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

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                autoComplete="name"
                placeholder="Ada Okonkwo"
                className="pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
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
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
            <PasswordStrengthMeter password={password} />
            <PasswordRequirements password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgName">Organization name</Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="orgName"
                autoComplete="organization"
                placeholder="Nnamdi Azikiwe University"
                className="pl-9"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          {/* Preferred subdomain */}
          <div className="space-y-2">
            <Label htmlFor="subdomain">Preferred subdomain (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                placeholder="unilag"
                className="flex-1"
                value={preferredSubdomain}
                onChange={(e) => setPreferredSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                disabled={submitting}
              />
              <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-xs text-muted-foreground">
                .votewise.com.ng
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              This will be your election portal URL: <span className="font-medium text-foreground">
                {preferredSubdomain || "yourorg"}.votewise.com.ng
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="institutionType">Institution type</Label>
            <Select
              value={institutionType}
              onValueChange={setInstitutionType}
            >
              <SelectTrigger id="institutionType" className="w-full">
                <SelectValue placeholder="Select your institution type" />
              </SelectTrigger>
              <SelectContent>
                {INSTITUTION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{type.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {type.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

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

      <CardContent className="pt-6">
        <div className="relative mb-4">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            or sign up with
          </span>
        </div>
        <GoogleAuthButton />
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
