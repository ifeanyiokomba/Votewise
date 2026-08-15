import { APP_NAME } from "./constants";

export const EmailTemplates = {
  voterOtp(opts: { code: string; electionName: string; voterName: string }) {
    return {
      subject: `${opts.code} — Your ${APP_NAME} voting code`,
      body: `Hello ${opts.voterName},

Your one-time voting password (OTVP) for the election "${opts.electionName}" is:

  ${opts.code}

This code expires in 10 minutes. Do not share it with anyone. Votewise staff will never ask for your code.

If you did not request this code, you can safely ignore this email.

— The ${APP_NAME} Team`,
    };
  },
  welcome(opts: { name: string; organizationName: string }) {
    return {
      subject: `Welcome to ${APP_NAME}, ${opts.name}`,
      body: `Hi ${opts.name},

Your organization "${opts.organizationName}" is now set up on ${APP_NAME}. You can start creating elections, importing voters and configuring your ballot right away.

— The ${APP_NAME} Team`,
    };
  },
  passwordReset(opts: { name: string; resetUrl: string }) {
    return {
      subject: `Reset your ${APP_NAME} password`,
      body: `Hi ${opts.name},

We received a request to reset your password. Click the link below to choose a new password:

${opts.resetUrl}

This link expires in 30 minutes. If you did not request a reset, ignore this email.

— The ${APP_NAME} Team`,
    };
  },
  receipt(opts: { name: string; electionName: string; reference: string }) {
    return {
      subject: `Vote received — ${opts.electionName}`,
      body: `Hi ${opts.name},

We have securely received your vote for "${opts.electionName}".

Verification reference: ${opts.reference}

You can use this reference to confirm your participation was recorded. For ballot secrecy, your individual selections are never tied to your identity.

— The ${APP_NAME} Team`,
    };
  },
};
