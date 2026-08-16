"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import {
  Mail,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Power,
  Settings2,
} from "lucide-react";

interface ProviderConfig {
  id: string;
  type: string;
  provider: string;
  label: string;
  isActive: boolean;
  isConfigured: boolean;
  fields: { key: string; label: string; type: string; placeholder?: string; required: boolean }[];
  credentials: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface AvailableProvider {
  type: string;
  provider: string;
  label: string;
  fields: { key: string; label: string; type: string; placeholder?: string; required: boolean }[];
}

export function ProviderManagementPanel() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [available, setAvailable] = useState<AvailableProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch<{ providers: ProviderConfig[]; availableProviders: AvailableProvider[] }>(
      "/api/admin/providers"
    );
    setLoading(false);
    if (res.success && res.data) {
      setConfigs(res.data.providers);
      setAvailable(res.data.availableProviders);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => { cancelled = true; };
  }, [load]);

  function startEditing(provider: AvailableProvider) {
    const existing = configs.find(c => c.type === provider.type && c.provider === provider.provider);
    setEditValues(existing?.credentials ?? {});
    setEditingProvider(`${provider.type}-${provider.provider}`);
  }

  async function saveProvider(type: string, provider: string) {
    setSaving(true);
    const res = await apiFetch("/api/admin/providers", {
      method: "POST",
      body: JSON.stringify({ type, provider, credentials: editValues, activate: true }),
    });
    setSaving(false);
    if (res.success) {
      toast.success("Provider saved & activated", { description: `${type} via ${provider} is now live.` });
      setEditingProvider(null);
      load();
    } else {
      toast.error("Save failed", { description: res.error?.message });
    }
  }

  async function toggleProvider(config: ProviderConfig) {
    const res = await apiFetch("/api/admin/providers", {
      method: "POST",
      body: JSON.stringify({
        type: config.type,
        provider: config.provider,
        credentials: config.credentials,
        activate: !config.isActive,
      }),
    });
    if (res.success) {
      toast.success(config.isActive ? "Provider deactivated" : "Provider activated");
      load();
    }
  }

  const typeIcons: Record<string, typeof Mail> = {
    EMAIL: Mail,
    SMS: Smartphone,
    WHATSAPP: MessageSquare,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Notification Providers</h2>
        <Badge variant="outline" className="text-[10px]">Plug & Play</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure your email, SMS, and WhatsApp providers here. Credentials are encrypted and stored securely.
        Changes take effect immediately — no restart needed.
      </p>

      {/* Active providers */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(["EMAIL", "SMS", "WHATSAPP"] as const).map((type) => {
          const activeConfig = configs.find(c => c.type === type && c.isActive);
          const Icon = typeIcons[type];
          const typeProviders = available.filter(p => p.type === type);

          return (
            <Card key={type} className={cn("overflow-hidden", activeConfig ? "border-primary/30" : "border-border")}>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("grid h-8 w-8 place-items-center rounded-lg", activeConfig ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{type}</p>
                      <p className="text-[10px] text-muted-foreground">{activeConfig?.label ?? "Not configured"}</p>
                    </div>
                  </div>
                  {activeConfig ? (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <XCircle className="h-3 w-3" /> Inactive
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {/* Provider options */}
                <div className="space-y-2">
                  {typeProviders.map((p) => {
                    const config = configs.find(c => c.type === type && c.provider === p.provider);
                    const isEditing = editingProvider === `${type}-${p.provider}`;
                    
                    return (
                      <div key={p.provider} className="rounded-lg border p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium">{p.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {config?.isConfigured ? "Configured" : "Not configured"}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {config?.isActive && config?.isConfigured && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => toggleProvider(config)}>
                                <Power className="h-3 w-3" /> Deactivate
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => startEditing(p)}>
                              {config?.isConfigured ? "Edit" : "Configure"}
                            </Button>
                          </div>
                        </div>

                        {/* Edit form */}
                        {isEditing && (
                          <div className="mt-3 space-y-2">
                            {p.fields.map((field) => (
                              <div key={field.key} className="space-y-1">
                                <Label className="text-[10px]">{field.label}{field.required && " *"}</Label>
                                <Input
                                  type={field.type === "password" ? "password" : "text"}
                                  value={editValues[field.key] ?? ""}
                                  onChange={(e) => setEditValues({ ...editValues, [field.key]: e.target.value })}
                                  placeholder={field.placeholder}
                                  className="h-7 text-xs"
                                />
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 flex-1 text-[10px]" disabled={saving} onClick={() => saveProvider(type, p.provider)}>
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save & Activate"}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setEditingProvider(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security note */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Settings2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Credentials are encrypted at rest</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              All API keys and secrets are encrypted with AES-256-GCM before being stored in the database.
              Only the platform admin can view and manage provider configurations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
