import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../components/layout/AuthLayout";
import { Field, OtpInput } from "../components/ui";
import { COLLEGE_DOMAIN } from "../lib/constants";
import { apiErrorMessage } from "../lib/format";
import { api } from "../services/api";

const ASIDE = (
  <>
    <p className="eyebrow text-accent">Account recovery</p>
    <h2 className="mt-3 text-4xl font-semibold leading-[1.05]">Locked out? It takes about a minute.</h2>
    <ul className="mt-8 space-y-3 text-sm text-ink-2">
      <li className="flex gap-3"><span className="font-mono text-ink-3">01</span> Enter your college email</li>
      <li className="flex gap-3"><span className="font-mono text-ink-3">02</span> Type the 6-digit code we send you</li>
      <li className="flex gap-3"><span className="font-mono text-ink-3">03</span> Choose a new password</li>
    </ul>
  </>
);

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (!cooldown) return undefined;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendOtp({ email: raw }) {
    const normalized = raw.toLowerCase().trim();
    try {
      await api.post("/auth/forgot-password", { email: normalized });
      setEmail(normalized);
      setStep(2);
      setCooldown(60);
      toast.success("Code sent to your inbox");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not send the code"));
    }
  }

  async function resend() {
    if (cooldown) return;
    try {
      await api.post("/auth/forgot-password", { email });
      setCooldown(60);
      toast.success("New code sent");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not resend the code"));
    }
  }

  async function verify(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setOtpError("Enter all 6 digits");
    setVerifying(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp });
      navigate("/reset-password", { state: { resetToken: data.resetToken } });
    } catch (error) {
      setOtpError(apiErrorMessage(error, "Invalid or expired code"));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AuthLayout aside={ASIDE}>
      {step === 1 ? (
        <>
          <h1 className="text-3xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-ink-2">We&apos;ll send a one-time code to your college email.</p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit(sendOtp)} noValidate>
            <Field label="College email" htmlFor="fp-email" error={errors.email?.message}>
              <input id="fp-email" className="input" type="email" autoComplete="email" placeholder={`name.23bce1234${COLLEGE_DOMAIN}`} {...register("email", { required: "Enter your email" })} />
            </Field>
            <button className="btn btn-primary btn-lg w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : <>Send code <ArrowRight size={16} /></>}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">Check your inbox</h1>
          <p className="mt-2 text-ink-2">Enter the code we sent to <span className="font-semibold text-ink">{email}</span>.</p>
          <form className="mt-8 space-y-4" onSubmit={verify}>
            <Field label="Verification code" error={otpError}>
              <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpError(""); }} autoFocus />
            </Field>
            <div className="flex justify-between text-xs">
              <button type="button" onClick={resend} disabled={cooldown > 0} className="font-semibold text-ink-2 hover:text-ink disabled:text-ink-3">
                {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
              <button type="button" onClick={() => { setStep(1); setOtp(""); }} className="inline-flex items-center gap-1 font-semibold text-ink-2 hover:text-ink">
                <ArrowLeft size={12} /> Change email
              </button>
            </div>
            <button className="btn btn-primary btn-lg w-full" disabled={verifying}>
              {verifying ? "Checking…" : <>Verify code <ArrowRight size={16} /></>}
            </button>
          </form>
        </>
      )}
      <p className="mt-8 border-t border-line pt-6 text-sm text-ink-2">
        Remembered it? <Link to="/login" className="link">Back to log in</Link>
      </p>
    </AuthLayout>
  );
}
