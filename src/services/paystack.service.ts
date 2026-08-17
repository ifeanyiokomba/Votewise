import crypto from "crypto";

/**
 * Paystack Payment Gateway Integration
 *
 * SECURITY MODEL:
 * 1. Client calls POST /api/elections/:id/activation/pay → this service
 *    initializes a Paystack transaction and returns the checkout URL.
 * 2. The ElectionPayment record is created with status=PENDING (NOT COMPLETED).
 * 3. The client is redirected to Paystack's hosted checkout page.
 * 4. After payment, Paystack calls our webhook (POST /api/webhooks/paystack).
 * 5. The webhook verifies the HMAC signature, then verifies the transaction
 *    via Paystack's API, and ONLY THEN marks the payment as COMPLETED +
 *    activates the election.
 *
 * The client-facing endpoint NEVER marks a payment as completed — only the
 * verified webhook can do that.
 */

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export interface InitializeTransactionParams {
  amount: number; // in kobo (smallest currency unit). 100 NGN = 10000 kobo
  currency: string; // "NGN", "USD", etc.
  reference: string; // our internal reference
  email: string; // customer email
  metadata: {
    electionId: string;
    organizationId: string;
    activationId: string;
    custom_fields: { display_name: string; variable_name: string; value: string }[];
  };
}

export interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string; // "success" | "failed" | "abandoned"
    reference: string;
    amount: number; // in kobo
    currency: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    customer: { email: string };
    metadata?: Record<string, unknown>;
  };
}

/**
 * Check if Paystack is configured. Used by the activation service to
 * decide whether to use real Paystack or fall back to mock (dev only).
 */
export function isPaystackConfigured(): boolean {
  return !!PAYSTACK_SECRET_KEY && PAYSTACK_SECRET_KEY.startsWith("sk_");
}

/**
 * Initialize a Paystack transaction. Returns the hosted checkout URL
 * the client should redirect to.
 */
export async function initializeTransaction(
  params: InitializeTransactionParams
): Promise<InitializeTransactionResponse> {
  if (!isPaystackConfigured()) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured. Set it in .env to accept real payments."
    );
  }

  const callbackUrl = `${APP_URL}/api/webhooks/paystack/return`;

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount, // kobo
      currency: params.currency,
      reference: params.reference,
      callback_url: callbackUrl,
      metadata: params.metadata,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Paystack initialize failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as InitializeTransactionResponse;
  if (!data.status) {
    throw new Error(`Paystack initialize error: ${data.message}`);
  }

  return data;
}

/**
 * Verify a transaction by reference. This is called by the webhook
 * after receiving a payment notification, to independently confirm
 * the payment status with Paystack's API (don't trust the webhook payload alone).
 */
export async function verifyTransaction(
  reference: string
): Promise<VerifyTransactionResponse> {
  if (!isPaystackConfigured()) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Paystack verify failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as VerifyTransactionResponse;
  if (!data.status) {
    throw new Error(`Paystack verify error: ${data.message}`);
  }

  return data;
}

/**
 * Verify the Paystack webhook signature using HMAC-SHA512.
 * Paystack sends an `x-paystack-signature` header containing the
 * hex-encoded HMAC of the raw request body, using the secret key.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!PAYSTACK_SECRET_KEY) return false;

  const expected = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}

export { PAYSTACK_PUBLIC_KEY };
