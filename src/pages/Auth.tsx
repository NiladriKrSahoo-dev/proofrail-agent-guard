import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import mark from "@/assets/proofrail-mark.svg";
import { ArrowRight, Loader2, Mail, ShieldCheck, UserX } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResettingThrottle, setIsResettingThrottle] = useState(false);
  const resetThrottle = useMutation(api.otpThrottleReset.resetForEmail);
  const emailRef = useRef<string>("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const isThrottleError = error?.includes("Too many verification codes");

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const email = formData.get("email") as string;
      emailRef.current = email;
      await signIn("email-otp", formData);
      setStep({ email });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleResetThrottle = async () => {
    if (!emailRef.current) return;
    setIsResettingThrottle(true);
    try {
      await resetThrottle({ email: emailRef.current });
      setError(null);
    } catch {
      setError("Could not reset throttle. Please wait a few minutes.");
    } finally {
      setIsResettingThrottle(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Decorative dark glows */}
      <div className="pointer-events-none absolute -left-24 top-10 -z-0 size-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 -z-0 size-[28rem] rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-96 bg-blueprint opacity-40" />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="glass-panel w-full max-w-[400px] p-7 sm:p-8">
          {/* Brand */}
          <button
            onClick={() => navigate("/")}
            className="mx-auto flex cursor-pointer flex-col items-center gap-3"
          >
            <img
              src={mark}
              alt="Proofrail"
              width={52}
              height={52}
              className="rounded-2xl"
            />
            <div className="text-center">
              <p className="text-lg font-bold tracking-tight">Proofrail</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Release assurance for regulated AI
              </p>
            </div>
          </button>

          {step === "signIn" ? (
            <>
              <h1 className="mt-7 text-center text-xl font-bold tracking-tight">
                Sign in to your workspace
              </h1>
              <p className="mt-1.5 text-center text-[13px] text-muted-foreground">
                Enter your email to log in or sign up
              </p>
              <form onSubmit={handleEmailSubmit} className="mt-5 space-y-4">
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="h-11 rounded-xl pl-9"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="h-11 w-11 shrink-0 cursor-pointer rounded-xl"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {error && (
                  <div className="space-y-2">
                    <p className="text-sm text-rose-300">{error}</p>
                    {isThrottleError && (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto cursor-pointer p-0 text-xs text-cyan-300"
                        onClick={handleResetThrottle}
                        disabled={isResettingThrottle}
                      >
                        {isResettingThrottle ? (
                          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                        ) : null}
                        Reset throttle (for testing)
                      </Button>
                    )}
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer rounded-xl"
                  onClick={handleGuestLogin}
                  disabled={isLoading}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Continue as Guest
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="mt-7 text-center text-xl font-bold tracking-tight">
                Check your email
              </h1>
              <p className="mt-1.5 text-center text-[13px] text-muted-foreground">
                We&apos;ve sent a verification code to {step.email}
              </p>
              <form onSubmit={handleOtpSubmit} className="mt-6 space-y-5">
                <input type="hidden" name="email" value={step.email} />
                <input type="hidden" name="code" value={otp} />

                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                        const form = (e.target as HTMLElement).closest("form");
                        if (form) form.requestSubmit();
                      }
                    }}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p className="text-center text-sm text-rose-300">{error}</p>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  Didn&apos;t receive a code?{" "}
                  <Button
                    variant="link"
                    className="h-auto cursor-pointer p-0"
                    onClick={() => setStep("signIn")}
                  >
                    Try again
                  </Button>
                </p>
                <Button
                  type="submit"
                  className="w-full cursor-pointer rounded-xl"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify code
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full cursor-pointer rounded-xl text-muted-foreground"
                  onClick={() => setStep("signIn")}
                  disabled={isLoading}
                >
                  Use different email
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-white/10 pt-4 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-cyan-300" />
            Every release decision is retained as auditable evidence.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
