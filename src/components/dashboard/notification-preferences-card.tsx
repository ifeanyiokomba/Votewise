"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Vote,
  CheckCircle2,
  ShieldAlert,
  Loader2,
} from "lucide-react";

type ChannelPrefs = { email: boolean; sms: boolean; whatsapp: boolean };
type Prefs = Record<string, ChannelPrefs>;

const PREF_CONFIG: {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "election-live",
    label: "Election goes live",
    description: "When an election transitions to LIVE status.",
    icon: Vote,
  },
  {
    key: "vote-cast",
    label: "Vote cast",
    description: "Each time a voter successfully casts a ballot.",
    icon: CheckCircle2,
  },
  {
    key: "election-closed",
    label: "Election closed",
    description: "When voting closes and results are ready for review.",
    icon: Bell,
  },
  {
    key: "results-published",
    label: "Results published",
    description: "When results are made public for voters.",
    icon: CheckCircle2,
  },
  {
    key: "security-alert",
    label: "Security alerts",
    description: "Suspicious activity, failed logins, or cross-tenant access attempts.",
    icon: ShieldAlert,
  },
];

const CHANNELS: {
  key: keyof ChannelPrefs;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: Smartphone },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
];

export function NotificationPreferencesCard() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch<{ preferences: Prefs }>(
      "/api/admin/notification-preferences"
    );
    setLoading(false);
    if (res.success && res.data) {
      setPrefs(res.data.preferences);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  function toggle(eventKey: string, channel: keyof ChannelPrefs, value: boolean) {
    setPrefs((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [eventKey]: { ...prev[eventKey], [channel]: value },
      };
    });
  }

  async function save() {
    if (!prefs) return;
    setSaving(true);
    const res = await apiFetch<{ preferences: Prefs }>(
      "/api/admin/notification-preferences",
      {
        method: "PATCH",
        body: JSON.stringify(prefs),
      }
    );
    setSaving(false);
    if (!res.success) {
      toast.error("Could not save preferences", { description: res.error?.message });
      return;
    }
    toast.success("Preferences saved", {
      description: "Notification preferences updated for your organization.",
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.075 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Notification preferences
          </CardTitle>
          <CardDescription>
            Choose which events trigger notifications and on which channels. Preferences are
            saved per organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {loading || !prefs ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            PREF_CONFIG.map((pref) => {
              const Icon = pref.icon;
              const channels = prefs[pref.key] ?? { email: false, sms: false, whatsapp: false };
              return (
                <div
                  key={pref.key}
                  className="flex flex-col gap-3 border-b py-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-xs text-muted-foreground">{pref.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
                    {CHANNELS.map((ch) => {
                      const ChIcon = ch.icon;
                      const checked = channels[ch.key];
                      return (
                        <label
                          key={ch.key}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                        >
                          <ChIcon className="h-3 w-3 text-muted-foreground" />
                          <span className={checked ? "font-medium text-foreground" : "text-muted-foreground"}>
                            {ch.label}
                          </span>
                          <Switch
                            checked={checked}
                            onCheckedChange={(v) => toggle(pref.key, ch.key, v)}
                            className="scale-75 data-[state=checked]:bg-primary"
                            aria-label={`Toggle ${ch.label} for ${pref.label}`}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t bg-muted/20 py-3">
          <p className="text-xs text-muted-foreground">
            Changes apply to future notifications only.
          </p>
          <Button size="sm" onClick={save} disabled={saving || loading || !prefs}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Save preferences
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
