import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ShieldCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const skills = ["React", "Node.js", "Express", "Neo4j", "Python", "Java", "UI Design", "Machine Learning", "Data Analysis", "Tailwind CSS"];
const interests = ["AI", "Web Development", "Hackathons", "Open Source", "Startups", "Cloud", "Cybersecurity", "Mobile Apps", "Research"];
const departments = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Business"];
const collegeDomain = "@vitapstudent.ac.in";

export default function Auth({ mode }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Registration multi-step state
  const [regStep, setRegStep] = useState(1); // 1 = email+OTP, 2 = fill profile
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step-1 form (email only)
  const {
    register: f1,
    handleSubmit: hs1,
    formState: { isSubmitting: s1, errors: e1 },
    getValues: gv1,
  } = useForm();

  // Step-2 / login form (profile + OTP)
  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { year: 3, graduationYear: new Date().getFullYear() + 1 },
  });
  const password = watch("password");

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  async function sendOtp(data) {
    try {
      await api.post("/auth/send-register-otp", { email: data.email });
      setVerifiedEmail(data.email.toLowerCase().trim());
      setOtpSent(true);
      setRegStep(2);
      startCooldown();
      toast.success("OTP sent to your college email!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
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
      await api.post("/auth/send-register-otp", { email: verifiedEmail });
      toast.success("New OTP sent!");
      startCooldown();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    }
  }

  // ── Final submit ──────────────────────────────────────────────────────────
  async function onSubmit(values) {
    try {
      if (isRegister && values.password !== values.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (isRegister) {
        await register({ ...values, email: verifiedEmail });
        toast.success("Account created. Welcome to VITAP Connect");
      } else {
        await login(values);
        toast.success("Welcome back");
      }
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Authentication failed");
    }
  }

  return (
    <section className="relative overflow-hidden px-4 py-6 sm:py-12 bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center">
      <div className="mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-[0.85fr_1.15fr] w-full">
        {/* Left panel */}
        <div className="card bg-slate-950 text-white dark:bg-slate-900">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/90 px-4 py-2 text-sm font-semibold text-slate-100 dark:bg-slate-700/90 dark:text-slate-100">
            <Sparkles size={16} /> VITAP student network
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold">
            {isRegister ? "Join VITAP Connect with your college email." : "Login to VITAP Connect."}
          </h1>
          <p className="mt-5 leading-7 text-slate-300">
            {isRegister
              ? "Verify your VIT-AP student email with a one-time code to create your account and join your campus network."
              : "Sign in with your VIT-AP student account to continue your chats, projects, and campus connections."}
          </p>
          <div className="mt-8 grid gap-4 text-sm text-slate-200">
            <p className="flex items-center gap-3"><ShieldCheck className="text-emerald-300" /> College email restriction only</p>
            {isRegister
              ? <p className="flex items-center gap-3"><ShieldCheck className="text-indigo-300" /> Email OTP verification — no fake accounts</p>
              : <p className="flex items-center gap-3"><ShieldCheck className="text-blue-300" /> Instant account access after signup</p>
            }
          </div>
        </div>

        {/* Right panel */}
        {isRegister ? (
          <div className="card space-y-5">
            {/* Step indicator */}
            <div className="flex items-center gap-3">
              <StepDot active={regStep >= 1} done={regStep > 1} label="1" />
              <div className={`flex-1 h-0.5 rounded ${regStep > 1 ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`} />
              <StepDot active={regStep >= 2} done={false} label="2" />
            </div>

            {/* ── STEP 1: Email + send OTP ─────────────────────────────────── */}
            {regStep === 1 && (
              <form className="space-y-4" onSubmit={hs1(sendOtp)}>
                <div>
                  <h2 className="font-display text-3xl font-bold">Create account</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Enter your VIT-AP email. We'll send a verification code before creating your account.
                  </p>
                </div>
                <input
                  id="reg-email"
                  className="input"
                  type="email"
                  placeholder={`name${collegeDomain}`}
                  {...f1("email", {
                    required: "Email is required",
                    validate: (v) => v.toLowerCase().endsWith(collegeDomain) || `Use your ${collegeDomain} email`,
                  })}
                />
                {e1.email && <p className="text-sm font-semibold text-rose-600">{e1.email.message}</p>}
                <button className="btn-primary w-full" disabled={s1}>
                  {s1 ? "Sending OTP…" : "Send Verification Code"}
                </button>
                <p className="text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link className="font-semibold text-slate-900 dark:text-slate-100" to="/login">Login</Link>
                </p>
              </form>
            )}

            {/* ── STEP 2: OTP + profile fields ─────────────────────────────── */}
            {regStep === 2 && (
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <h2 className="font-display text-3xl font-bold">Verify & Create</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Code sent to{" "}
                    <span className="font-medium text-indigo-500">{verifiedEmail}</span>.
                    Fill in your profile and paste the OTP to finish.
                  </p>
                </div>

                {/* OTP box at top */}
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4 space-y-2">
                  <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="reg-otp"
                    className="input tracking-[0.5em] text-center text-xl font-bold placeholder:tracking-normal"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="——————"
                    autoComplete="one-time-code"
                    {...field("otp", {
                      required: "OTP is required",
                      pattern: { value: /^\d{6}$/, message: "Enter the 6-digit code" },
                    })}
                  />
                  {errors.otp && <p className="text-xs text-red-500">{errors.otp.message}</p>}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      className="font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-40"
                      onClick={resendOtp}
                      disabled={resendCooldown > 0}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                    <button type="button" className="underline" onClick={() => { setRegStep(1); setOtpSent(false); }}>
                      Change email
                    </button>
                  </div>
                </div>

                {/* Profile fields */}
                <input className="input" placeholder="Full name" {...field("name", { required: "Name is required" })} />
                <input className="input" type="password" placeholder="Password" {...field("password", { required: "Password is required", minLength: { value: 6, message: "Use at least 6 characters" } })} />
                <input className="input" type="password" placeholder="Confirm password" {...field("confirmPassword", { validate: (v) => v === password || "Passwords do not match" })} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <input className="input" list="department-list" placeholder="Department" {...field("department", { required: true })} />
                  <input className="input" type="number" min="1" max="5" placeholder="Current year" {...field("year", { required: true })} />
                  <input className="input" type="number" min="2026" max="2035" placeholder="Graduation year" {...field("graduationYear", { required: true })} />
                  <input className="input" placeholder="Club or society" {...field("club")} />
                  <input className="input sm:col-span-2" list="skill-list" placeholder="Skills: React, Node.js, Neo4j" {...field("skills", { required: true })} />
                  <input className="input sm:col-span-2" list="interest-list" placeholder="Interests: AI, Web Development" {...field("interests", { required: true })} />
                  <select className="input" {...field("goal")}>
                    <option>Find project partners</option><option>Join hackathon teams</option>
                    <option>Learn from seniors</option><option>Build portfolio projects</option>
                  </select>
                  <select className="input" {...field("availability")}>
                    <option>Evenings</option><option>Weekends</option>
                    <option>After classes</option><option>Flexible</option>
                  </select>
                  <textarea className="input sm:col-span-2" rows="2" placeholder="Short bio: what do you want to build?" {...field("bio")} />
                </div>

                {(errors.email || errors.confirmPassword || errors.password || errors.name) && (
                  <p className="text-sm font-semibold text-rose-600">
                    {errors.name?.message || errors.email?.message || errors.password?.message || errors.confirmPassword?.message}
                  </p>
                )}

                <button className="btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account…" : "Verify & Create Account"}
                </button>
                <p className="text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link className="font-semibold text-slate-900 dark:text-slate-100" to="/login">Login</Link>
                </p>
              </form>
            )}
          </div>
        ) : (
          /* ── LOGIN FORM (unchanged) ────────────────────────────────────── */
          <form className="card space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <h2 className="font-display text-3xl font-bold">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Login with your registered VIT-AP email and password.</p>
            </div>
            <input className="input" type="email" placeholder={`name${collegeDomain}`} {...field("email", { required: "Email is required" })} />
            <input className="input" type="password" placeholder="Password" {...field("password", { required: "Password is required", minLength: { value: 6, message: "Use at least 6 characters" } })} />
            {(errors.email || errors.password) && (
              <p className="text-sm font-semibold text-rose-600">{errors.email?.message || errors.password?.message}</p>
            )}
            <button className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : "Login"}
            </button>
            <p className="text-center text-sm text-slate-500">
              <Link className="font-semibold text-slate-900 dark:text-slate-100" to="/forgot-password">Forgot Password?</Link>
            </p>
            <p className="text-center text-sm text-slate-500">
              New to VITAP Connect?{" "}
              <Link className="font-semibold text-slate-900 dark:text-slate-100" to="/register">Register</Link>
            </p>
          </form>
        )}
      </div>
      <datalist id="skill-list">{skills.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="interest-list">{interests.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="department-list">{departments.map((item) => <option key={item} value={item} />)}</datalist>
    </section>
  );
}

function StepDot({ active, done, label }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors
      ${done ? "bg-indigo-500 text-white" : active ? "border-2 border-indigo-500 text-indigo-500" : "border-2 border-slate-300 dark:border-slate-600 text-slate-400"}`}>
      {done ? "✓" : label}
    </div>
  );
}
