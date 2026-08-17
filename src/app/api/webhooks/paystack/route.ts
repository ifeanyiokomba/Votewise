import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ActivationService } from "@/services/activation.service";
import {
  verifyWebhookSignature,
  verifyTransaction,
  isPaystackConfigured,
} from "@/services/paystack.service";
import { AuditService } from "@/services/audit.service";

/**
 * Paystack Webhook Handler
 *
 * SECURITY (Finding #5): This is the ONLY endpoint that can mark a payment
 * as COMPLETED for real Paystack payments. The flow is:
 *
 * 1. Paystack sends a POST to this endpoint with the event data.
 * 2. We verify the HMAC-SHA512 signature using PAYSTACK_SECRET_KEY.
 * 3. We independently verify the transaction via Paystack's API (don't trust
 *    the webhook payload alone — it could be spoofed without the signature).
 * 4. Only if both verifications pass do we mark the payment as COMPLETED
 *    and activate the election.
 *
 * The client-facing /api/elections/:id/activation/pay endpoint NEVER marks
 * a payment as completed — it only initializes the transaction and returns
 * the checkout URL.
 */

export async function POST(request: Request) {
  try {
    // Get the raw body and signature header
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") ?? "";

    // ─── Step 1: Verify HMAC signature ───
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 400 }
      );
    }

    if (!isPaystackConfigured()) {
      // If Paystack isn't configured, this webhook shouldn't be called.
      // Return 200 so Paystack doesn't retry, but log the issue.
      console.warn("[paystack-webhook] Received webhook but Paystack is not configured");
      return NextResponse.json({ status: "ignored" });
    }

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("[paystack-webhook] Invalid signature — rejecting");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // ─── Step 2: Parse the event ───
    const event = JSON.parse(rawBody) as PaystackWebhookEvent;

    // Only handle successful charge events
    if (event.event !== "charge.success") {
      console.log(`[paystack-webhook] Ignoring event: ${event.event}`);
      return NextResponse.json({ status: "ignored" });
    }

    const data = event.data;
    const reference = data.reference;

    if (!reference) {
      console.warn("[paystack-webhook] No reference in webhook data");
      return NextResponse.json(
        { error: "Missing reference" },
        { status: 400 }
      );
    }

    // ─── Step 3: Independently verify the transaction via Paystack API ───
    // Don't trust the webhook payload alone — verify with Paystack directly.
    const verification = await verifyTransaction(reference);

    if (verification.data.status !== "success") {
      console.warn(
        `[paystack-webhook] Transaction ${reference} status: ${verification.data.status}`
      );
      // Mark payment as failed
      await db.electionPayment.updateMany({
        where: { reference },
        data: { status: "FAILED", gatewayResponse: JSON.stringify(verification.data) },
      });
      return NextResponse.json({ status: "failed" });
    }

    // ─── Step 4: Verify the amount matches ───
    // Paystack returns amount in kobo; our DB stores in the currency's major unit (NGN)
    const expectedAmountKobo = verification.data.amount;
    const payment = await db.electionPayment.findUnique({
      where: { reference },
      include: { activation: true },
    });

    if (!payment) {
      console.warn(`[paystack-webhook] Payment not found for reference: ${reference}`);
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const expectedAmountInOurUnits = payment.amount * 100; // convert to kobo
    if (expectedAmountKobo !== expectedAmountInOurUnits) {
      console.error(
        `[paystack-webhook] Amount mismatch for ${reference}: expected ${expectedAmountInOurUnits}, got ${expectedAmountKobo}`
      );
      await db.electionPayment.update({
        where: { id: payment.id },
        data: { status: "FAILED", gatewayResponse: JSON.stringify(verification.data) },
      });
      return NextResponse.json(
        { error: "Amount mismatch" },
        { status: 400 }
      );
    }

    // ─── Step 5: Confirm the payment and activate the election ───
    const result = await ActivationService.confirmPayment(
      reference,
      data.reference, // Paystack's gateway reference
      JSON.stringify(verification.data)
    );

    if (!result.confirmed) {
      console.error(`[paystack-webhook] Failed to confirm payment: ${reference}`);
      return NextResponse.json(
        { error: "Confirmation failed" },
        { status: 500 }
      );
    }

    // Log the successful payment verification
    if (payment.activation) {
      await AuditService.log({
        organizationId: payment.activation.organizationId,
        action: "PAYMENT_RECEIVED",
        resource: "activation",
        resourceId: payment.activation.electionId,
        result: "SUCCESS",
        metadata: {
          reference,
          gatewayReference: data.reference,
          amount: payment.amount,
          currency: payment.currency,
          verifiedVia: "paystack-webhook",
        },
        userAgent: "paystack-webhook",
      });
    }

    console.log(
      `[paystack-webhook] Payment ${reference} confirmed and election activated`
    );

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("[paystack-webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Paystack sends a GET redirect to this URL after the customer completes
 * (or cancels) the checkout on Paystack's hosted page. The actual payment
 * confirmation happens via the POST webhook above — this is just a user-facing
 * redirect back to the dashboard.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const status = url.searchParams.get("status");

  // Redirect back to the activate page — it will show the celebration dialog
  // if the webhook has already processed, or a "processing" state if not.
  const redirectUrl = reference
    ? `/dashboard/elections/${reference}/activate?payment_status=${status ?? "processing"}`
    : "/dashboard";

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}

interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    customer: { email: string };
  };
}
