import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../components/layout/AuthLayout";
import { Field, PasswordInput, PasswordStrength } from "../components/ui";
import { apiErrorMessage } from "../lib/format";
import { api } from "../services/api";

const ASIDE = (
  <>
    <p className="eyebrow text-accent">Last step</p>
    <h2 className="mt-3 text-4xl font-semibold leading-[1.05]">Pick something you haven&apos;t used before.</h2>
    <p className="mt-4 text-ink-2">Mix upper and lower case, numbers and a symbol for a strong password.</p>
  </>
);

export default function ResetPassword() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const resetToken = state?.resetToken;
  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm();
  const password = watch("password");

  async function onSubmit({ password: newPassword }) {
    try {
      await api.post("/auth/reset-password", { token: resetToken, newPassword });
      toast.success("Password updated — log in with your new password");
      navigate("/login");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not reset your password"));
    }
  }

  return (
    <AuthLayout aside={ASIDE}>
      {!resetToken ? (
        <>
          <h1 className="text-3xl font-semibold">Link expired</h1>
          <p className="mt-2 text-ink-2">Your reset session is missing or has expired. Start again to get a new code.</p>
          <Link to="/forgot-password" className="btn btn-primary btn-lg mt-8 w-full">Start over</Link>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">Set a new password</h1>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="New password" htmlFor="rp-password" error={errors.password?.message}>
              <PasswordInput
                id="rp-password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...register("password", { required: "Choose a password", minLength: { value: 8, message: "Use at least 8 characters" } })}
              />
              {password && <PasswordStrength password={password} />}
            </Field>
            <Field label="Confirm password" htmlFor="rp-confirm" error={errors.confirmPassword?.message}>
              <PasswordInput id="rp-confirm" autoComplete="new-password" {...register("confirmPassword", { validate: (v) => v === password || "Passwords don't match" })} />
            </Field>
            <button className="btn btn-primary btn-lg w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : <>Update password <ArrowRight size={16} /></>}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
