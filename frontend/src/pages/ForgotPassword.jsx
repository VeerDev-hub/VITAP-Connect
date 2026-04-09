import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = email, 2 = OTP
  const [email, setEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Step 1 form ────────────────────────────────────────────────────────────
  const {
    register: r1,
    handleSubmit: hs1,
    formState: { isSubmitting: s1 },
  } = useForm();

  // ── Step 2 form ────────────────────────────────────────────────────────────
  const {
    register: r2,
    handleSubmit: hs2,
    formState: { isSubmitting: s2 },
    setError: se2,
  } = useForm();

  async function sendOtp(data) {
    setEmail(data.email.toLowerCase().trim());
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      toast.success("OTP sent to your email!");
      setStep(2);
      startCooldown();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    }
  }

  async function verifyOtp(data) {
    try {
      const res = await api.post("/auth/verify-otp", {
        email,
        otp: data.otp.trim(),
      });
      toast.success("OTP verified! Set your new password.");
      navigate("/reset-password", { state: { resetToken: res.data.resetToken } });
    } catch (err) {
      se2("otp", { message: err.response?.data?.message || "Invalid OTP" });
      toast.error(err.response?.data?.message || "Invalid or expired OTP");
    }
  }

  function startCooldown() {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function resendOtp() {
    if (resendCooldown > 0) return;
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("New OTP sent!");
      startCooldown();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
      <div className="card w-full max-w-md space-y-6">

        {/* Progress indicators */}
        <div className="flex items-center gap-3">
          <StepDot active={step >= 1} done={step > 1} label="1" />
          <div className={`flex-1 h-0.5 rounded ${step > 1 ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`} />
          <StepDot active={step >= 2} done={false} label="2" />
        </div>

        {step === 1 && (
          <form className="space-y-4" onSubmit={hs1(sendOtp)}>
            <div>
              <h2 className="font-display text-3xl font-bold">Forgot Password</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter your VIT-AP email and we&apos;ll send you a 6-digit OTP.
              </p>
            </div>
            <input
              id="fp-email"
              className="input"
              type="email"
              placeholder="name@vitapstudent.ac.in"
              {...r1("email", { required: "Email is required" })}
            />
            <button className="btn-primary w-full" disabled={s1}>
              {s1 ? "Sending OTP…" : "Send OTP"}
            </button>
            <p className="text-center text-sm text-slate-500">
              <Link className="font-semibold text-slate-900 dark:text-slate-100" to="/login">
                Back to Login
              </Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-4" onSubmit={hs2(verifyOtp)}>
            <div>
              <h2 className="font-display text-3xl font-bold">Enter OTP</h2>
              <p className="mt-1 text-sm text-slate-500">
                We sent a 6-digit code to <span className="font-medium text-indigo-500">{email}</span>. It expires in 10 minutes.
              </p>
            </div>

            <OtpInput register={r2} />

            <button className="btn-primary w-full" disabled={s2}>
              {s2 ? "Verifying…" : "Verify OTP"}
            </button>

            <div className="flex items-center justify-between text-sm text-slate-500">
              <button
                type="button"
                className="font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={resendOtp}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
              <button type="button" className="underline" onClick={() => setStep(1)}>
                Change email
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

/** Small 6-box OTP input that behaves like a real OTP field */
function OtpInput({ register }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        6-Digit OTP
      </label>
      <input
        id="otp-input"
        className="input tracking-[0.5em] text-center text-2xl font-bold placeholder:tracking-normal"
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="——————"
        autoComplete="one-time-code"
        {...register("otp", {
          required: "OTP is required",
          pattern: { value: /^\d{6}$/, message: "Enter the 6-digit code" },
        })}
      />
    </div>
  );
}

function StepDot({ active, done, label }) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors
        ${done ? "bg-indigo-500 text-white" : active ? "border-2 border-indigo-500 text-indigo-500" : "border-2 border-slate-300 dark:border-slate-600 text-slate-400"}`}
    >
      {done ? "✓" : label}
    </div>
  );
}