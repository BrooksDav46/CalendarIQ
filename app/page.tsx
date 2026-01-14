"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";

/* ============================
   TYPES
============================ */

type StepId = "email" | "code";

type AuthData = {
  email: string;
  code: string;
  flow: "signIn" | "signUp" | null;
};

type StepProps = {
  data: AuthData;
  update: (patch: Partial<AuthData>) => void;
  next: () => void;
  back: () => void;

  loading: boolean;
  error: string | null;

  sendCode: () => Promise<void>;
  verifyCode: () => Promise<void>;
  resendCode: () => Promise<void>;
  resetAll: () => void;
};

/* ============================
   STORAGE
============================ */

const STORAGE_KEY = "clientflow:auth:v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadSaved(): { step: StepId; data: AuthData } | null {
  if (typeof window === "undefined") return null;
  return safeParse<{ step: StepId; data: AuthData }>(
    window.localStorage.getItem(STORAGE_KEY)
  );
}

function saveSaved(payload: { step: StepId; data: AuthData }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function clearSaved() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/* ============================
   HELPERS
============================ */

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidCode(code: string) {
  return /^[0-9]{6}$/.test(code.trim());
}

function getClerkErrorMessage(err: any) {
  const e0 = err?.errors?.[0];
  return (
    e0?.longMessage ||
    e0?.message ||
    err?.message ||
    "Something went wrong. Try again."
  );
}

/* ============================
   UI SHELL
============================ */

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        {subtitle ? (
          <p className="text-gray-600 mb-6">{subtitle}</p>
        ) : (
          <div className="mb-6" />
        )}
        {children}
      </div>
    </main>
  );
}

/* ============================
   STEP 1 — EMAIL
============================ */

function EmailStep({
  data,
  update,
  next,
  loading,
  error,
  sendCode,
}: StepProps) {
  const [touched, setTouched] = useState(false);

  const emailTrimmed = normalizeEmail(data.email);
  const emailOk = isValidEmail(emailTrimmed);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailOk) return;

    update({ email: emailTrimmed });
    await sendCode();
    next();
  };

  return (
    <CardShell
      title="New Client Intake"
      subtitle="Enter your email to receive a login code."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={data.email}
            onChange={(e) => update({ email: e.target.value })}
            onBlur={() => setTouched(true)}
            className="w-full border rounded px-3 py-2"
          />

          {touched && !emailOk ? (
            <p className="mt-2 text-sm text-red-600">
              Enter a valid email (example: test@gmail.com)
            </p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {/* ✅ CLERK SMART CAPTCHA MOUNT */}
        <div id="clerk-captcha" />

        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Sending code..." : "Continue"}
        </button>
      </form>
    </CardShell>
  );
}

/* ============================
   STEP 2 — CODE
============================ */

function CodeStep({
  data,
  update,
  back,
  loading,
  error,
  verifyCode,
  resendCode,
  resetAll,
}: StepProps) {
  const codeOk = isValidCode(data.code);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeOk) return;
    await verifyCode();
  };

  return (
    <CardShell
      title="Enter code"
      subtitle={`We sent a 6-digit code to ${normalizeEmail(data.email)}`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          inputMode="numeric"
          placeholder="123456"
          value={data.code}
          onChange={(e) => update({ code: e.target.value })}
          className="w-full border rounded px-3 py-2 tracking-widest"
          maxLength={6}
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={back}
            className="flex-1 border py-2 rounded"
            disabled={loading}
          >
            Back
          </button>

          <button
            type="submit"
            className="flex-1 bg-black text-white py-2 rounded"
            disabled={loading || !codeOk}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>

        <div className="flex justify-between pt-2">
          <button type="button" onClick={resendCode} className="underline">
            Resend code
          </button>
          <button type="button" onClick={resetAll} className="underline">
            Start over
          </button>
        </div>
      </form>
    </CardShell>
  );
}

/* ============================
   STEP REGISTRY
============================ */

const STEP_ORDER: StepId[] = ["email", "code"];

const STEPS = {
  email: { id: "email", render: (p: StepProps) => <EmailStep {...p} /> },
  code: { id: "code", render: (p: StepProps) => <CodeStep {...p} /> },
};

/* ============================
   PAGE
============================ */

export default function Page() {
  const router = useRouter();

  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();

  const [step, setStep] = useState<StepId>("email");
  const [data, setData] = useState<AuthData>({
    email: "",
    code: "",
    flow: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setStep(saved.step);
      setData(saved.data);
    }
  }, []);

  useEffect(() => {
    saveSaved({ step, data });
  }, [step, data]);

  const update = (patch: Partial<AuthData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const nav = useMemo(() => {
    const clamp = (i: number) =>
      Math.max(0, Math.min(i, STEP_ORDER.length - 1));
    return {
      next: () => setStep(STEP_ORDER[clamp(STEP_ORDER.indexOf(step) + 1)]),
      back: () => setStep(STEP_ORDER[clamp(STEP_ORDER.indexOf(step) - 1)]),
    };
  }, [step]);

  const resetAll = () => {
    clearSaved();
    setError(null);
    setLoading(false);
    setStep("email");
    setData({ email: "", code: "", flow: null });
  };

  const ensureLoaded = () => {
    if (!signInLoaded || !signUpLoaded || !signIn || !signUp || !setActive) {
      throw new Error("Auth still loading");
    }
  };

  const sendCode = async () => {
  setError(null);
  setLoading(true);

  try {
    ensureLoaded();

    const email = normalizeEmail(data.email);
    if (!isValidEmail(email)) throw new Error("Please enter a valid email.");

    // reset code + flow every time we send
    update({ code: "", flow: null });

    // --- 1) Try SIGN UP first (new user) ---
    // If it fails (email exists), fall back to SIGN IN.
    try {
      const su = await signUp!.create({ emailAddress: email });

      await su.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      update({ flow: "signUp" });
      return;
    } catch (err: any) {
      // --- 2) Existing user -> SIGN IN ---
      const si = await signIn!.create({ identifier: email });

      // Clerk sometimes requires which email to send to for email_code
      const emailFactor = si.supportedFirstFactors?.find(
        (f: any) => f.strategy === "email_code"
      );

      const emailAddressId =
        (emailFactor as any)?.emailAddressId ||
        (emailFactor as any)?.email_address_id;

      if (!emailAddressId) {
        // If this happens, the account might not support email_code,
        // or supportedFirstFactors isn't populated as expected.
        throw new Error(
          "Email code sign-in is not available for this account. Try a different email."
        );
      }

      await si.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId,
      });

      update({ flow: "signIn" });
      return;
    }
  } catch (err: any) {
    setError(getClerkErrorMessage(err));
    throw err;
  } finally {
    setLoading(false);
  }
};

const resendCode = async () => {
  // Uses the same logic as sendCode
  await sendCode();
};

const verifyCode = async () => {
  setError(null);
  setLoading(true);

  try {
    ensureLoaded();

    const code = data.code.trim();
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code.");

    const finalize = async (sessionId?: string | null) => {
      if (!sessionId) {
        throw new Error("No session returned. Try resending the code.");
      }
      await setActive!({ session: sessionId });
      clearSaved();
      router.push("/dashboard");
    };

    const trySignUp = async () => {
      const res = await signUp!.attemptEmailAddressVerification({ code });
      if (res.status === "complete") return finalize(res.createdSessionId);
      throw new Error(`Verification not complete (${res.status}). Resend code.`);
    };

    const trySignIn = async () => {
      const res = await signIn!.attemptFirstFactor({
        strategy: "email_code",
        code,
      });
      if (res.status === "complete") return finalize(res.createdSessionId);
      throw new Error(`Verification not complete (${res.status}). Resend code.`);
    };

    // Prefer the flow we stored when sending the code
    if (data.flow === "signUp") {
      await trySignUp();
      return;
    }

    if (data.flow === "signIn") {
      await trySignIn();
      return;
    }

    // Fallback if flow was lost (localStorage cleared, refresh, etc.)
    try {
      await trySignUp();
      return;
    } catch {
      await trySignIn();
      return;
    }
  } catch (err: any) {
    setError(getClerkErrorMessage(err));
  } finally {
    setLoading(false);
  }
};


  return STEPS[step].render({
    data,
    update,
    next: nav.next,
    back: nav.back,
    loading,
    error,
    sendCode,
    verifyCode,
    resendCode,
    resetAll,
  });
}
