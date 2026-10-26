"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LoaderCircle, MessageCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "login" | "register" | "recover";
type Step = "details" | "otp" | "pin";
type Channel = "SMS" | "WHATSAPP";
type ApiError = { error?: { message?: string } };

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error((payload as ApiError).error?.message ?? "Something went wrong.");
  return payload as T;
}

export function AuthFlow() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("details");
  const [channel, setChannel] = useState<Channel>();
  const [preferredName, setPreferredName] = useState("");
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [referralCode, setReferralCode] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("ref")?.toUpperCase() ?? "");
  const [testOtp, setTestOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next); setStep("details"); setError(""); setChannel(undefined); setOtp(""); setPin(""); setConfirmPin("");
  }

  async function submitDetails(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (mode === "login") {
        await post("/api/v1/auth/login", { phone, pin });
        router.replace("/account"); router.refresh(); return;
      }
      if (!channel) throw new Error("Choose SMS or WhatsApp first.");
      const result = await post<{ data: { challengeId: string; testOtp?: string } }>("/api/v1/auth/otp/request", {
        ...(mode === "register" ? { preferredName } : {}), phone, channel, purpose: mode === "register" ? "REGISTRATION" : "PIN_RESET",
      });
      setChallengeId(result.data.challengeId); setTestOtp(result.data.testOtp ?? ""); setStep("otp");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function submitOtp(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await post<{ data: { verificationToken: string } }>("/api/v1/auth/otp/verify", { challengeId, otp });
      setVerificationToken(result.data.verificationToken); setStep("pin");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function submitPin(event: FormEvent) {
    event.preventDefault(); setError("");
    if (pin !== confirmPin) { setError("Those PINs do not match."); return; }
    setBusy(true);
    try {
      await post(mode === "register" ? "/api/v1/auth/register/complete" : "/api/v1/auth/pin/reset", { verificationToken, pin, ...(mode === "register" && referralCode ? { referralCode } : {}) });
      router.replace("/account"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  return <div>
    <div className="mb-8 flex rounded-full bg-black/5 p-1 text-sm font-semibold">
      <button onClick={() => switchMode("login")} className={cn("flex-1 rounded-full px-4 py-3", mode === "login" && "bg-white shadow-sm")}>Sign in</button>
      <button onClick={() => switchMode("register")} className={cn("flex-1 rounded-full px-4 py-3", mode === "register" && "bg-white shadow-sm")}>Join Crave</button>
    </div>

    {step !== "details" && <button type="button" onClick={() => { setStep(step === "pin" ? "otp" : "details"); setError(""); }} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> Back</button>}
    <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-crave-red">{mode === "recover" ? "PIN recovery" : mode === "register" ? "Your Crave account" : "Welcome back"}</p>
    <h1 className="mb-3 text-4xl font-semibold leading-tight sm:text-5xl">{step === "otp" ? "Check your messages." : step === "pin" ? "Make it yours." : mode === "login" ? "Let’s pick up where you left off." : mode === "register" ? "A little closer to delicious." : "Reset your PIN."}</h1>
    <p className="mb-8 text-sm leading-relaxed text-crave-muted">{step === "otp" ? `Enter the 6-digit code sent by ${channel === "SMS" ? "SMS" : "WhatsApp"}.` : step === "pin" ? "Choose a 6-digit PIN you’ll use whenever you sign in." : mode === "login" ? "Use the phone number and PIN linked to your account." : "Choose how you want your one-time code before continuing."}</p>

    {error && <div role="alert" className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
    {testOtp && step === "otp" && <div className="mb-5 rounded-2xl border border-dashed border-crave-orange bg-orange-50 px-4 py-3 text-sm"><strong>Development code:</strong> {testOtp}</div>}

    {step === "details" && <form onSubmit={submitDetails} className="space-y-5">
      {mode !== "login" && <fieldset><legend className="mb-3 text-sm font-semibold">1. Where should we send your code?</legend><div className="grid grid-cols-2 gap-3"><ChannelButton active={channel === "SMS"} onClick={() => setChannel("SMS")} icon={<Smartphone size={20} />} label="SMS" /><ChannelButton active={channel === "WHATSAPP"} onClick={() => setChannel("WHATSAPP")} icon={<MessageCircle size={20} />} label="WhatsApp" /></div></fieldset>}
      {mode === "register" && <Field label="2. What should we call you?" value={preferredName} onChange={setPreferredName} placeholder="Your preferred name" autoComplete="name" />}
      <Field label={mode === "login" ? "Phone number" : mode === "register" ? "3. Your phone number" : "2. Your phone number"} value={phone} onChange={setPhone} placeholder="0801 234 5678" type="tel" autoComplete="tel" />
      {mode === "register" && <Field label="Referral code (optional)" value={referralCode} onChange={(value) => setReferralCode(value.toUpperCase())} placeholder="CRV…" autoComplete="off" required={false} />}
      {mode === "login" && <Field label="Your 6-digit PIN" value={pin} onChange={setPin} placeholder="••••••" type="password" inputMode="numeric" maxLength={6} autoComplete="current-password" />}
      <Button className="w-full" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : mode === "login" ? "Sign in" : "Send my code"}</Button>
      {mode === "login" && <button type="button" onClick={() => switchMode("recover")} className="w-full text-center text-sm font-semibold text-crave-red">Forgot your PIN?</button>}
      {mode === "recover" && <button type="button" onClick={() => switchMode("login")} className="w-full text-center text-sm font-semibold">Return to sign in</button>}
    </form>}

    {step === "otp" && <form onSubmit={submitOtp} className="space-y-5"><Field label="One-time code" value={otp} onChange={setOtp} placeholder="000000" inputMode="numeric" maxLength={6} autoComplete="one-time-code" /><Button className="w-full" disabled={busy || otp.length !== 6}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : "Verify code"}</Button></form>}
    {step === "pin" && <form onSubmit={submitPin} className="space-y-5"><Field label="Create PIN" value={pin} onChange={setPin} placeholder="••••••" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" /><Field label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} placeholder="••••••" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" /><Button className="w-full" disabled={busy || pin.length !== 6 || confirmPin.length !== 6}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : <><Check size={17} /> {mode === "register" ? "Create my account" : "Save new PIN"}</>}</Button></form>}
  </div>;
}

function ChannelButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("flex min-h-20 items-center gap-3 rounded-2xl border px-4 text-left font-semibold transition", active ? "border-crave-red bg-red-50 text-crave-red" : "border-black/10 bg-white hover:border-black/25")}>{icon}<span>{label}</span>{active && <Check className="ml-auto" size={17} />}</button>;
}

type FieldProps = { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; inputMode?: "numeric"; maxLength?: number; autoComplete?: string; required?: boolean };
function Field({ label, value, onChange, placeholder, type = "text", required = true, ...props }: FieldProps) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><input required={required} value={value} onChange={(event) => onChange(props.inputMode === "numeric" ? event.target.value.replace(/\D/g, "") : event.target.value)} placeholder={placeholder} type={type} className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none transition placeholder:text-black/25 focus:border-crave-orange focus:ring-4 focus:ring-orange-100" {...props} /></label>;
}
