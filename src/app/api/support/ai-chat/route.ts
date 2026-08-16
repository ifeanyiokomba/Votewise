import { ok, handleError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";

/**
 * AI-powered support chat.
 * Asks the user about their concern, then collects their details
 * (voting ID or matric number) before escalating to a support ticket.
 *
 * Uses z-ai-web-dev-sdk for the LLM backend.
 */

const SYSTEM_PROMPT = `You are the Votewise support assistant. Your job is to help voters and organization members with election-related issues.

FLOW:
1. Greet the user warmly and ask what their concern is about.
2. Once they describe the issue, ask for their identifying details:
   - For voters: their voting ID, matric number, email, or phone number
   - For org admins: their organization name and email
3. Based on the issue, try to provide helpful information.
4. If the issue needs human attention, tell them you'll create a support ticket.

Keep responses concise, friendly, and professional. You are representing Votewise, a secure election platform by Okomba Inc.

COMMON ISSUES YOU CAN HELP WITH:
- OTP/verification codes not received (check spam folder, wait 60 seconds, request resend)
- Can't vote (election must be LIVE, voter must be verified first)
- Voter eligibility (contact organization admin)
- Results not showing (depends on result visibility setting: live, after-close, or published-only)
- Receipt/verification reference (found on the receipt page after voting)
- Account access (password reset via forgot password link)

Always end your response with a helpful next step.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, electionId } = body as {
      messages: Array<{ role: string; content: string }>;
      electionId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return ok({
        response:
          "Hello! 👋 I'm the Votewise support assistant. How can I help you today? Are you having trouble with voting, verification, or something else?",
      });
    }

    // Build context with election info if provided
    let contextPrompt = SYSTEM_PROMPT;
    if (electionId) {
      const election = await db.election.findUnique({
        where: { id: electionId },
        select: { name: true, status: true, startTime: true, endTime: true },
      });
      if (election) {
        contextPrompt += `\n\nCURRENT ELECTION CONTEXT:\n- Election: ${election.name}\n- Status: ${election.status}\n- Start: ${election.startTime}\n- End: ${election.endTime}`;
      }
    }

    // Use z-ai-web-dev-sdk
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: contextPrompt },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
      thinking: { type: "disabled" },
    });

    const response = completion.choices[0]?.message?.content;

    return ok({ response: response || "I'm sorry, I couldn't process that. Could you rephrase?" });
  } catch (e) {
    console.error("[ai-chat] error:", e);
    // Fallback response if AI fails
    return ok({
      response:
        "I'm having trouble connecting right now. Please describe your issue and I'll make sure a support agent sees it. You can also reach us at support@votewise.com.ng.",
      error: true,
    });
  }
}
