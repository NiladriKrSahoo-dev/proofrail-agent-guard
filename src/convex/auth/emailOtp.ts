import { Email } from "@convex-dev/auth/providers/Email";
import { Resend } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

const sendVerificationRequest = async (
  { identifier: email, token }: { identifier: string; token: string },
  ctx: {
    runMutation: (ref: unknown, args: Record<string, unknown>) => Promise<unknown>;
  },
) => {
  // Enforce throttle limit per email address
  await ctx.runMutation("otpThrottle:checkAndRecord", {
    key: email.toLowerCase(),
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[OTP Code for ${email}]: ${token} (Set RESEND_API_KEY in Convex Environment Variables to send emails)`,
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.AUTH_EMAIL_FROM || "Proofrail Auth <onboarding@resend.dev>",
    to: [email],
    subject: `Your Proofrail verification code: ${token}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; color: #f4f4f5;">
        <div style="margin-bottom: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Proofrail Verification Code</h2>
          <p style="margin-top: 6px; font-size: 13px; color: #a1a1aa;">Release assurance for regulated AI</p>
        </div>
        <p style="font-size: 14px; color: #d4d4d8; line-height: 1.5;">Use the code below to complete your sign-in request:</p>
        <div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #38bdf8;">${token}</span>
        </div>
        <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">This code expires in 15 minutes.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send OTP via Resend:", error);
    throw new Error(`Could not send verification email: ${error.message}`);
  }
};

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  sendVerificationRequest: sendVerificationRequest as unknown as (
    params: any,
  ) => Promise<void>,
});
