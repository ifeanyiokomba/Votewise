"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
  Phone,
  ChevronDown,
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
import {
  PasswordStrengthMeter,
  PasswordRequirements,
} from "@/components/shared/password-strength";
import { GoogleAuthButton } from "@/components/shared/google-auth-button";

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

// Country codes — covers major countries worldwide (not just Africa)
const COUNTRIES = [
  { code: "+234", name: "Nigeria 🇳🇬", iso: "NG" },
  { code: "+1", name: "United States / Canada 🇺🇸🇨🇦", iso: "US" },
  { code: "+44", name: "United Kingdom 🇬🇧", iso: "GB" },
  { code: "+233", name: "Ghana 🇬🇭", iso: "GH" },
  { code: "+254", name: "Kenya 🇰🇪", iso: "KE" },
  { code: "+27", name: "South Africa 🇿🇦", iso: "ZA" },
  { code: "+234", name: "Egypt 🇪🇬", iso: "EG" },
  { code: "+212", name: "Morocco 🇲🇦", iso: "MA" },
  { code: "+91", name: "India 🇮🇳", iso: "IN" },
  { code: "+86", name: "China 🇨🇳", iso: "CN" },
  { code: "+81", name: "Japan 🇯🇵", iso: "JP" },
  { code: "+61", name: "Australia 🇦🇺", iso: "AU" },
  { code: "+49", name: "Germany 🇩🇪", iso: "DE" },
  { code: "+33", name: "France 🇫🇷", iso: "FR" },
  { code: "+34", name: "Spain 🇪🇸", iso: "ES" },
  { code: "+39", name: "Italy 🇮🇹", iso: "IT" },
  { code: "+31", name: "Netherlands 🇳🇱", iso: "NL" },
  { code: "+46", name: "Sweden 🇸🇪", iso: "SE" },
  { code: "+47", name: "Norway 🇳🇴", iso: "NO" },
  { code: "+358", name: "Finland 🇫🇮", iso: "FI" },
  { code: "+48", name: "Poland 🇵🇱", iso: "PL" },
  { code: "+55", name: "Brazil 🇧🇷", iso: "BR" },
  { code: "+52", name: "Mexico 🇲🇽", iso: "MX" },
  { code: "+57", name: "Colombia 🇨🇴", iso: "CO" },
  { code: "+54", name: "Argentina 🇦🇷", iso: "AR" },
  { code: "+56", name: "Chile 🇨🇱", iso: "CL" },
  { code: "+51", name: "Peru 🇵🇪", iso: "PE" },
  { code: "+58", name: "Venezuela 🇻🇪", iso: "VE" },
  { code: "+971", name: "UAE 🇦🇪", iso: "AE" },
  { code: "+966", name: "Saudi Arabia 🇸🇦", iso: "SA" },
  { code: "+972", name: "Israel 🇮🇱", iso: "IL" },
  { code: "+90", name: "Turkey 🇹🇷", iso: "TR" },
  { code: "+62", name: "Indonesia 🇮🇩", iso: "ID" },
  { code: "+60", name: "Malaysia 🇲🇾", iso: "MY" },
  { code: "+65", name: "Singapore 🇸🇬", iso: "SG" },
  { code: "+63", name: "Philippines 🇵🇭", iso: "PH" },
  { code: "+66", name: "Thailand 🇹🇭", iso: "TH" },
  { code: "+82", name: "South Korea 🇰🇷", iso: "KR" },
  { code: "+64", name: "New Zealand 🇳🇿", iso: "NZ" },
  { code: "+232", name: "Sierra Leone 🇸🇱", iso: "SL" },
  { code: "+231", name: "Liberia 🇱🇷", iso: "LR" },
  { code: "+225", name: "Côte d'Ivoire 🇨🇮", iso: "CI" },
  { code: "+223", name: "Mali 🇲🇱", iso: "ML" },
  { code: "+221", name: "Senegal 🇸🇳", iso: "SN" },
  { code: "+226", name: "Burkina Faso 🇧🇫", iso: "BF" },
  { code: "+228", name: "Togo 🇹🇬", iso: "TG" },
  { code: "+229", name: "Benin 🇧🇯", iso: "BJ" },
  { code: "+227", name: "Niger 🇳🇪", iso: "NE" },
  { code: "+235", name: "Chad 🇹🇩", iso: "TD" },
  { code: "+237", name: "Cameroon 🇨🇲", iso: "CM" },
  { code: "+241", name: "Gabon 🇬🇦", iso: "GA" },
  { code: "+242", name: "Congo 🇨🇬", iso: "CG" },
  { code: "+243", name: "DR Congo 🇨🇩", iso: "CD" },
  { code: "+250", name: "Rwanda 🇷🇼", iso: "RW" },
  { code: "+257", name: "Burundi 🇧🇮", iso: "BI" },
  { code: "+258", name: "Mozambique 🇲🇿", iso: "MZ" },
  { code: "+260", name: "Zambia 🇿🇲", iso: "ZM" },
  { code: "+263", name: "Zimbabwe 🇿🇼", iso: "ZW" },
  { code: "+264", name: "Namibia 🇳🇦", iso: "NA" },
  { code: "+267", name: "Botswana 🇧🇼", iso: "BW" },
  { code: "+268", name: "Eswatini 🇸🇿", iso: "SZ" },
  { code: "+266", name: "Lesotho 🇱🇸", iso: "LS" },
  { code: "+238", name: "Cape Verde 🇨🇻", iso: "CV" },
  { code: "+245", name: "Guinea-Bissau 🇬🇼", iso: "GW" },
  { code: "+245", name: "Guinea 🇬🇳", iso: "GN" },
  { code: "+250", name: "Tanzania 🇹🇿", iso: "TZ" },
  { code: "+256", name: "Uganda 🇺🇬", iso: "UG" },
  { code: "+251", name: "Ethiopia 🇪🇹", iso: "ET" },
  { code: "+252", name: "Somalia 🇸🇴", iso: "SO" },
  { code: "+253", name: "Djibouti 🇩🇯", iso: "DJ" },
  { code: "+259", name: "Comoros 🇰🇲", iso: "KM" },
  { code: "+269", name: "Seychelles 🇸🇨", iso: "SC" },
  { code: "+230", name: "Mauritius 🇲🇺", iso: "MU" },
  { code: "+261", name: "Madagascar 🇲🇬", iso: "MG" },
  { code: "+265", name: "Malawi 🇲🇼", iso: "MW" },
  { code: "+269", name: "São Tomé 🇸🇹", iso: "ST" },
  { code: "+240", name: "Equatorial Guinea 🇬🇶", iso: "GQ" },
  { code: "+239", name: "São Tomé & Príncipe 🇸🇹", iso: "ST" },
  { code: "+220", name: "Gambia 🇬🇲", iso: "GM" },
  { code: "+222", name: "Mauritania 🇲🇷", iso: "MR" },
  { code: "+224", name: "Guinea 🇬🇳", iso: "GN" },
  { code: "+225", name: "Côte d'Ivoire 🇨🇮", iso: "CI" },
  { code: "+227", name: "Niger 🇳🇪", iso: "NE" },
].sort((a, b) => a.name.localeCompare(b.name));

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const searchParams = useSearchParams();
  const googleEmail = searchParams.get("email");
  const googleName = searchParams.get("name");

  const [name, setName] = React.useState(googleName ?? "");
  const [email, setEmail] = React.useState(googleEmail ?? "");
  const [phone, setPhone] = React.useState("");
  const [countryCode, setCountryCode] = React.useState("+234");
  const [password, setPassword] = React.useState("");
  const [organizationName, setOrganizationName] = React.useState("");
  const [preferredSubdomain, setPreferredSubdomain] = React.useState("");
  const [institutionType, setInstitutionType] = React.useState("UNIVERSITY");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Tailored description based on institution type
  const institutionLabel = INSTITUTION_TYPES.find((t) => t.value === institutionType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 5) {
      setError("Please enter your phone number.");
      return;
    }
    if (!password && !googleEmail) {
      setError("Please create a password.");
      return;
    }
    if (password && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password && !/[A-Z]/.test(password)) {
      setError("Password must include at least one uppercase letter.");
      return;
    }
    if (password && !/[0-9]/.test(password)) {
      setError("Password must include at least one number.");
      return;
    }
    if (!organizationName.trim() || organizationName.trim().length < 2) {
      setError("Please enter your organization name.");
      return;
    }

    // Combine country code + phone
    const fullPhone = `${countryCode}${phone.trim().replace(/^0+/, "")}`;

    setSubmitting(true);
    try {
      const res = await apiFetch<{ user: { id: string } }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password || crypto.randomUUID().slice(0, 16),
            phone: fullPhone,
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
        description: `Welcome to Votewise. Your ${institutionLabel?.label ?? "organization"} is ready.`,
      });
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
          Run secure, transparent elections for your members — anywhere in the world.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Google sign-up (not shown for admin) */}
        {!googleEmail && (
          <>
            <GoogleAuthButton className="mb-4" />
            <div className="relative mb-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or sign up with email
              </span>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
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
                  disabled={submitting || !!googleEmail}
                  required
                />
              </div>
            </div>
          </div>

          {/* Phone number with country code selector */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[180px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={`${country.iso}-${country.code}`} value={country.code}>
                      <span className="text-xs">{country.name}</span>
                      <span className="ml-1 font-mono text-xs text-muted-foreground">{country.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="801 234 5678"
                  className="pl-9"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ""))}
                  disabled={submitting}
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Used for password recovery via SMS OTP and election notifications.
              Full number: <span className="font-medium text-foreground">{countryCode}{phone.trim().replace(/^0+/, "")}</span>
            </p>
          </div>

          {/* Password (hidden if Google signup) */}
          {!googleEmail && (
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
          )}

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
              Your election portal URL: <span className="font-medium text-foreground">
                {preferredSubdomain || "yourorg"}.votewise.com.ng
              </span>
            </p>
          </div>

          {/* Institution type — tailored experience */}
          <div className="space-y-2">
            <Label htmlFor="institutionType">Organization type</Label>
            <Select
              value={institutionType}
              onValueChange={setInstitutionType}
            >
              <SelectTrigger id="institutionType" className="w-full">
                <SelectValue placeholder="Select your organization type" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
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
            {/* Tailored hint based on selected type */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {institutionType === "NGO" && "📋 Your dashboard will be tailored for NGO board elections — trustee selection, board resolutions, and member voting."}
                {institutionType === "CHURCH" && "⛪ Your dashboard will be tailored for church governance — elder selection, committee votes, and congregation surveys."}
                {institutionType === "CORPORATE" && "🏢 Your dashboard will be tailored for corporate elections — board selection, shareholder votes, and AGM resolutions."}
                {institutionType === "COOPERATIVE" && "🤝 Your dashboard will be tailored for cooperative management — board elections, policy votes, and member resolutions."}
                {institutionType === "CLUB_SOCIETY" && "🏆 Your dashboard will be tailored for club elections — executive committee, social events, and member decisions."}
                {institutionType === "GOVERNMENT" && "🏛️ Your dashboard will be tailored for institutional elections — agency leadership, committee votes, and public consultations."}
                {institutionType === "PROFESSIONAL_ASSOCIATION" && "💼 Your dashboard will be tailored for association elections — executive committee, council votes, and membership decisions."}
                {(institutionType === "UNIVERSITY" || institutionType === "STUDENT_UNION") && "🎓 Your dashboard will be tailored for student elections — SUG, faculty reps, and departmental elections."}
                {institutionType === "OTHER" && "🌍 Your dashboard will be set up for general-purpose elections with flexible configuration."}
              </p>
            </div>
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
          <a href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </CardContent>

      <Separator className="bg-border/70" />

      <CardFooter className="justify-center pt-2 text-sm">
        <span className="text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </a>
        </span>
      </CardFooter>
    </Card>
  );
}
