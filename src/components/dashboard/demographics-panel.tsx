"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Building2, GraduationCap, Layers } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

export interface DemographicGroup {
  label: string;
  total: number;
  verified: number;
  voted: number;
}

export interface DemographicsData {
  byFaculty: DemographicGroup[];
  byDepartment: DemographicGroup[];
  byLevel: DemographicGroup[];
}

interface DemographicsPanelProps {
  demographics: DemographicsData;
}

export function DemographicsPanel({ demographics }: DemographicsPanelProps) {
  const hasData =
    demographics.byFaculty.length > 0 ||
    demographics.byDepartment.length > 0 ||
    demographics.byLevel.length > 0;

  if (!hasData) return null;

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-primary" />
          Demographic breakdown
        </CardTitle>
        <CardDescription>
          Turnout by faculty, department and level. Voter identities are never exposed — only aggregate counts.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 pt-4 md:grid-cols-3">
        <DemographicColumn
          title="By Faculty"
          icon={Building2}
          groups={demographics.byFaculty}
        />
        <DemographicColumn
          title="By Department"
          icon={GraduationCap}
          groups={demographics.byDepartment}
        />
        <DemographicColumn
          title="By Level"
          icon={Layers}
          groups={demographics.byLevel}
        />
      </CardContent>
    </Card>
  );
}

function DemographicColumn({
  title,
  icon: Icon,
  groups,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  groups: DemographicGroup[];
}) {
  if (groups.length === 0) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground/50">No data available</p>
      </div>
    );
  }

  const maxTotal = Math.max(...groups.map((g) => g.total), 1);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
      </div>
      <div className="space-y-3">
        {groups.slice(0, 8).map((group) => {
          const turnoutPct =
            group.total > 0 ? (group.voted / group.total) * 100 : 0;
          const barWidth = (group.total / maxTotal) * 100;
          return (
            <div key={group.label} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">{group.label}</span>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {formatNumber(group.total)}
                </Badge>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary/20"
                  style={{ width: `${barWidth}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{ width: `${(barWidth * turnoutPct) / 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{formatNumber(group.voted)} voted</span>
                <span>{formatPercent(turnoutPct, 0)} turnout</span>
              </div>
            </div>
          );
        })}
        {groups.length > 8 && (
          <p className="pt-1 text-[10px] text-muted-foreground">
            +{groups.length - 8} more…
          </p>
        )}
      </div>
    </div>
  );
}
