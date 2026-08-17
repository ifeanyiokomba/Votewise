import { ok, handleError } from "@/lib/api-response";
import { db } from "@/lib/db";

/**
 * AI-powered support chat.
 *
 * Production: uses OpenAI API if OPENAI_API_KEY is set.
 * Fallback: rule-based responses for common issues.
 *
 * The z-ai-web-dev-sdk was removed (sandbox-only package).
 */

const SYSTEM_PROMPT = `You are the Votewise support assistant. Your job is to help voters and organization members with election-related issues.

FLOW:
1. Greet the user warmly and ask what their concern is about.
2. Once they describe the issue, ask for their identifying details:
   - For voters: their voting ID, matric number, email, or phone number
   - For org admins: their organization name and email
3. Based on the issue, try to provide helpful information.
4. If the issue needs human attention, tell them you'll create a support ticket.

Keep responses concise, friendly, and professional. You are representing Votewise, a secure election platform by Okomba Analytics.

COMMON ISSUES YOU CAN HELP WITH:
- OTP/verification codes not received (check spam folder, wait 60 seconds, request resend)
- Can't vote (election must be LIVE, voter must be verified first)
- Voter eligibility (contact organization admin)
- Results not showing (depends on result visibility setting: live, after-close, or published-only)
- Receipt/verification reference (found on the receipt page after voting)
- Account access (password reset via forgot password link)

Always end your response with a helpful next step.`;

/**
 * Rule-based fallback when no LLM is configured.
 * Matches keywords in the user's message and returns helpful responses.
 */
function ruleBasedResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes("otp") || msg.includes("code") || msg.includes("verification")) {
    return "For OTP/verification issues:\n\n1. Check your spam/junk folder for the code\n2. Wait at least 60 seconds before requesting a resend\n3. You can switch to a different channel (Email → SMS → WhatsApp) using the buttons below the code input\n4. If you still don't receive it, contact your organization admin — they can resend it for you\n\nNeed me to help with anything else?";
  }

  if (msg.includes("vote") || msg.includes("ballot") || msg.includes("cast")) {
    return "To cast your vote:\n\n1. Enter your voter ID, email, or matric number on the election page\n2. Verify with the OTP code sent to you\n3. Select your candidate(s) on the ballot\n4. Review your selections and confirm\n5. Save your receipt reference\n\nIf you can't access the ballot, the election may not be LIVE yet, or you may have already voted. Would you like me to help with something specific?";
  }

  if (msg.includes("result") || msg.includes("outcome") || msg.includes("winner")) {
    return "Election results visibility depends on the organization admin's settings:\n\n• Real-time: Results show live as votes are cast\n• After close: Results appear when voting ends\n• Published only: Results appear after the admin publishes them\n\nIf results aren't showing, they may not be available yet. Check back later or contact your organization admin.";
  }

  if (msg.includes("receipt") || msg.includes("reference") || msg.includes("verify")) {
    return "Your voting receipt is shown on the receipt page after you cast your ballot. It contains a unique reference number you can use to verify your vote was recorded. If you lost your receipt reference, you can use the 'Verify Ballot' feature on the election page with your voter ID.";
  }

  if (msg.includes("password") || msg.includes("login") || msg.includes("account")) {
    return "For account access issues:\n\n• Forgot your password? Use the 'Forgot password?' link on the login page\n• Organization members should contact their admin if they can't log in\n• Platform admins can reset via the forgot password flow\n\nAnything else I can help with?";
  }

  if (msg.includes("eligib") || msg.includes("register") || msg.includes("can't find")) {
    return "Voter eligibility is managed by your organization admin. If you can't find your voter record:\n\n1. Make sure you're using the correct identifier (voter ID, email, matric number, or phone)\n2. Contact your organization admin to confirm you're registered\n3. Only org admins can add or update voter records\n\nIs there anything else I can help with?";
  }

  // Default response
  return "I'm here to help with election-related issues including:\n\n• OTP/verification code problems\n• Voting and ballot questions\n• Results visibility\n• Receipt verification\n• Account access\n\nCould you describe what you need help with? If you need human assistance, you can also email support@votewise.com.ng.";
}

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

    // Try OpenAI if configured
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: contextPrompt },
              ...messages.map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
              })),
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.choices?.[0]?.message?.content;
          if (aiResponse) {
            return ok({ response: aiResponse });
          }
        }
      } catch {
        // Fall through to rule-based response
      }
    }

    // Fallback: rule-based response
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const response = lastUserMessage
      ? ruleBasedResponse(lastUserMessage.content)
      : ruleBasedResponse("");

    return ok({ response });
  } catch (e) {
    return handleError(e);
  }
}
