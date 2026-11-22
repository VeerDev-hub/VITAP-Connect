import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "motion/react";
import AuthLayout from "../components/layout/AuthLayout";
import { Field, OtpInput, PasswordInput, PasswordStrength, TagInput } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { AVAILABILITY, COLLEGE_DOMAIN, DEPARTMENTS, GOALS, INTERESTS, SKILLS } from "../lib/constants";
import { apiErrorMessage } from "../lib/format";
import { api } from "../services/api";

function useCooldown() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!seconds) return undefined;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);
  return [seconds, () => setSeconds(60)];
}

const LOGIN_ASIDE = (
  <>
    <p className="eyebrow text-accent">Welcome back</p>
    <h2 className="mt-3 text-4xl font-semibold leading-[1.05]">Your teams, chats and requests are where you left them.</h2>
    <ul className="mt-8 space-y-3 text-sm text-ink-2">
      <li className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pop text-[11px] font-extrabold text-pop-ink">01</span> Pick up conversations with your connections</li>
      <li className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pop text-[11px] font-extrabold text-pop-ink">02</span> Review join requests on your projects</li>
      <li className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pop text-[11px] font-extrabold text-pop-ink">03</span> Jump into a team call from any room</li>
    </ul>
  </>
);

const REGISTER_ASIDE = (
  <>
    <p className="eyebrow text-accent">Students only</p>
    <h2 className="mt-3 text-4xl font-semibold leading-[1.05]">Built for people with a <span className="marker">@vitapstudent</span> address.</h2>
    <p className="mt-4 text-ink-2">Every account is verified with a one-time code sent to your college inbox — no outsiders, no fake profiles.</p>
  </>
);

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  async function onSubmit(values) {
    try {
      await login(values);
      toast.success("Welcome back");
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error, "Login failed"));
    }
  }

  return (
    <AuthLayout aside={LOGIN_ASIDE}>
      <h1 className="text-[1.75rem] leading-tight">Log in</h1>
      <p className="mt-2 text-ink-2">Use the college email you registered with.</p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="College email" htmlFor="login-email" error={errors.email?.message}>
          <input id="login-email" className="input" type="email" autoComplete="email" placeholder={`name.23bce1234${COLLEGE_DOMAIN}`} {...register("email", { required: "Enter your email" })} />
        </Field>
        <Field
          label={<span className="flex justify-between"><span>Password</span><Link to="/forgot-password" className="font-medium text-ink-3 hover:text-ink">Forgot?</Link></span>}
          htmlFor="login-password"
          error={errors.password?.message}
        >
          <PasswordInput id="login-password" autoComplete="current-password" placeholder="••••••••" {...register("password", { required: "Enter your password" })} />
        </Field>
        <button className="btn btn-primary btn-lg w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logging in…" : <>Log in <ArrowRight size={16} /></>}
        </button>
      </form>
      <p className="mt-8 border-t border-line pt-6 text-sm text-ink-2">
        New here? <Link to="/register" className="link">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

function StepHeader({ step }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between text-xs font-bold">
        {["Verify email", "Your profile"].map((label, i) => (
          <span key={label} className={step >= i + 1 ? "text-ink" : "text-ink-3"}>
            <span className="mr-1.5 text-accent">{i + 1}.</span>{label}
          </span>
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-pop" initial={false} animate={{ width: step === 1 ? "50%" : "100%" }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
    </div>
  );
}

function Register() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [cooldown, startCooldown] = useCooldown();

  const emailForm = useForm();
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { otp: "", year: 3, graduationYear: new Date().getFullYear() + 1, skills: [], interests: [], goal: GOALS[0], availability: AVAILABILITY[0] }
  });
  const password = watch("password");

  async function sendOtp({ email: raw }) {
    try {
      await api.post("/auth/send-register-otp", { email: raw });
      setEmail(raw.toLowerCase().trim());
      setStep(2);
      startCooldown();
      toast.success("Code sent — check your college inbox");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not send the code"));
    }
  }

  async function resend() {
    if (cooldown) return;
    try {
      await api.post("/auth/send-register-otp", { email });
      startCooldown();
      toast.success("New code sent");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not resend the code"));
    }
  }

  async function onSubmit(values) {
    try {
      await createAccount({ ...values, email });
      toast.success("Account created — welcome!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not create your account"));
    }
  }

  return (
    <AuthLayout aside={REGISTER_ASIDE}>
      <StepHeader step={step} />

      {step === 1 && (
        <>
          <h1 className="text-[1.75rem] leading-tight">Create your account</h1>
          <p className="mt-2 text-ink-2">We&apos;ll email a 6-digit code to confirm you&apos;re a VIT-AP student.</p>
          <form className="mt-8 space-y-4" onSubmit={emailForm.handleSubmit(sendOtp)} noValidate>
            <Field label="College email" htmlFor="reg-email" error={emailForm.formState.errors.email?.message}>
              <input
                id="reg-email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder={`name.23bce1234${COLLEGE_DOMAIN}`}
                {...emailForm.register("email", {
                  required: "Enter your college email",
                  validate: (v) => v.toLowerCase().trim().endsWith(COLLEGE_DOMAIN) || `Must end with ${COLLEGE_DOMAIN}`
                })}
              />
            </Field>
            <button className="btn btn-primary btn-lg w-full" disabled={emailForm.formState.isSubmitting}>
              {emailForm.formState.isSubmitting ? "Sending code…" : <>Send verification code <ArrowRight size={16} /></>}
            </button>
          </form>
          <p className="mt-8 border-t border-line pt-6 text-sm text-ink-2">
            Already registered? <Link to="/login" className="link">Log in</Link>
          </p>
        </>
      )}

      {step === 2 && (
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)} noValidate>
          <section>
            <div className="flex items-start gap-3 rounded-md border border-line bg-sunken p-3 text-sm">
              <MailCheck size={18} className="mt-0.5 shrink-0 text-ok" />
              <p className="text-ink-2">Code sent to <span className="font-semibold text-ink">{email}</span>. It expires in 10 minutes.</p>
            </div>
            <Field label="Verification code" className="mt-4" error={errors.otp?.message}>
              <Controller
                name="otp"
                control={control}
                rules={{ validate: (v) => /^\d{6}$/.test(v) || "Enter all 6 digits" }}
                render={({ field }) => <OtpInput value={field.value} onChange={field.onChange} autoFocus />}
              />
            </Field>
            <div className="mt-2 flex justify-between text-xs">
              <button type="button" onClick={resend} disabled={cooldown > 0} className="font-semibold text-ink-2 hover:text-ink disabled:text-ink-3">
                {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 font-semibold text-ink-2 hover:text-ink">
                <ArrowLeft size={12} /> Change email
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <p className="eyebrow">Account</p>
            <Field label="Full name" htmlFor="reg-name" error={errors.name?.message}>
              <input id="reg-name" className="input" autoComplete="name" {...register("name", { required: "Enter your name" })} />
            </Field>
            <Field label="Password" htmlFor="reg-password" error={errors.password?.message}>
              <PasswordInput
                id="reg-password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...register("password", { required: "Choose a password", minLength: { value: 8, message: "Use at least 8 characters" }, maxLength: { value: 64, message: "Too long" } })}
              />
              {password && <PasswordStrength password={password} />}
            </Field>
            <Field label="Confirm password" htmlFor="reg-confirm" error={errors.confirmPassword?.message}>
              <PasswordInput id="reg-confirm" autoComplete="new-password" {...register("confirmPassword", { validate: (v) => v === password || "Passwords don't match" })} />
            </Field>
          </section>

          <section className="space-y-4">
            <p className="eyebrow">Academics</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" htmlFor="reg-dept" className="sm:col-span-2" error={errors.department && "Choose your department"}>
                <input id="reg-dept" className="input" list="department-list" placeholder="e.g. Computer Science" {...register("department", { required: true })} />
              </Field>
              <Field label="Current year" htmlFor="reg-year">
                <input id="reg-year" className="input" type="number" min="1" max="5" {...register("year", { required: true })} />
              </Field>
              <Field label="Graduating in" htmlFor="reg-grad">
                <input id="reg-grad" className="input" type="number" min="2024" max="2035" {...register("graduationYear", { required: true })} />
              </Field>
              <Field label="Club or society" hint="optional" htmlFor="reg-club" className="sm:col-span-2">
                <input id="reg-club" className="input" {...register("club")} />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <p className="eyebrow">What you bring</p>
            <Field label="Skills" htmlFor="reg-skills" error={errors.skills && "Add at least one skill"}>
              <Controller name="skills" control={control} rules={{ validate: (v) => v.length > 0 }} render={({ field }) => <TagInput id="reg-skills" value={field.value} onChange={field.onChange} suggestions={SKILLS} />} />
            </Field>
            <Field label="Interests" htmlFor="reg-interests" error={errors.interests && "Add at least one interest"}>
              <Controller name="interests" control={control} rules={{ validate: (v) => v.length > 0 }} render={({ field }) => <TagInput id="reg-interests" value={field.value} onChange={field.onChange} suggestions={INTERESTS} />} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Main goal" htmlFor="reg-goal">
                <select id="reg-goal" className="input" {...register("goal")}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select>
              </Field>
              <Field label="Usually free" htmlFor="reg-avail">
                <select id="reg-avail" className="input" {...register("availability")}>{AVAILABILITY.map((a) => <option key={a}>{a}</option>)}</select>
              </Field>
            </div>
            <Field label="Short bio" hint="optional" htmlFor="reg-bio">
              <textarea id="reg-bio" className="input" rows={3} placeholder="What do you want to build this semester?" {...register("bio")} />
            </Field>
          </section>

          <button className="btn btn-primary btn-lg w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : <>Create account <ArrowRight size={16} /></>}
          </button>
          <datalist id="department-list">{DEPARTMENTS.map((d) => <option key={d} value={d} />)}</datalist>
        </form>
      )}
    </AuthLayout>
  );
}

export default function Auth({ mode }) {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;
  return mode === "register" ? <Register /> : <Login />;
}
