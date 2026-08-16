"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";

/**
 * Google authentication button.
 *
 * Initiates Google OAuth flow by fetching the auth URL from the server
 * and redirecting to Google's consent screen.
 *
 * Google auth is available for organization users ONLY.
 * Platform admins cannot use Google auth.
 */
export function GoogleAuthButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleGoogleAuth() {
    setLoading(true);
    try {
      const res = await apiFetch<{ enabled: boolean; authUrl: string | null }>(
        "/api/auth/google"
      );
      if (res.success && res.data?.enabled && res.data.authUrl) {
        window.location.href = res.data.authUrl;
      } else {
        // Google OAuth not configured — redirect to login with error
        window.location.href = "/login?error=google_not_configured";
      }
    } catch {
      window.location.href = "/login?error=google_init_failed";
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleGoogleAuth}
      disabled={loading}
      className={cn("w-full gap-2", className)}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <GoogleIcon className="size-4" />
      )}
      <span>{loading ? "Connecting…" : "Continue with Google"}</span>
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09 0-.73.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}
