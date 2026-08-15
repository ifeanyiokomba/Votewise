import { db } from "@/lib/db";
import { PRICING_CONFIG } from "@/lib/constants";

export interface PricingConfig {
  standardRate: number;
  bulkThreshold: number;
  bulkRate: number;
  currency: string;
}

export interface PriceCalculation {
  voterCount: number;
  applicableRate: number;
  totalAmount: number;
  currency: string;
  pricingRule: string;
}

export interface PriceSnapshot {
  voterCount: number;
  applicableRate: number;
  calculatedAmount: number;
  currency: string;
  pricingRuleVersion: string;
  calculatedAt: string;
}

export class PricingService {
  static getConfig(): PricingConfig {
    return { ...PRICING_CONFIG };
  }

  static calculatePrice(voterCount: number): PriceCalculation {
    const { standardRate, bulkThreshold, bulkRate, currency } = PRICING_CONFIG;
    const applicableRate = voterCount > bulkThreshold ? bulkRate : standardRate;
    const totalAmount = voterCount * applicableRate;
    return {
      voterCount,
      applicableRate,
      totalAmount,
      currency,
      pricingRule: voterCount > bulkThreshold ? "BULK" : "STANDARD",
    };
  }

  static async calculateElectionPrice(electionId: string): Promise<PriceCalculation> {
    const voterCount = await db.voter.count({
      where: { electionId, isEligible: true },
    });
    return this.calculatePrice(voterCount);
  }

  static createSnapshot(calculation: PriceCalculation): PriceSnapshot {
    return {
      voterCount: calculation.voterCount,
      applicableRate: calculation.applicableRate,
      calculatedAmount: calculation.totalAmount,
      currency: calculation.currency,
      pricingRuleVersion: `v1_${new Date().toISOString().split("T")[0]}`,
      calculatedAt: new Date().toISOString(),
    };
  }

  static async createActivationQuote(electionId: string) {
    const election = await db.election.findUnique({
      where: { id: electionId },
      select: { id: true, name: true, organizationId: true, status: true },
    });
    if (!election) throw new Error("Election not found");
    const calculation = await this.calculateElectionPrice(electionId);
    const snapshot = this.createSnapshot(calculation);
    return {
      electionId: election.id,
      electionName: election.name,
      organizationId: election.organizationId,
      pricingRule: calculation.pricingRule,
      ...snapshot,
    };
  }
}
