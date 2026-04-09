import { useForm } from "react-hook-form";
import { useLocation, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function ResetPassword() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const resetToken = state?.resetToken;

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm();

  const password = watch("password");

  // Guard: if no token in state, redirect back
  if (!resetToken) {
    return (
      <section className="flex min-h-screen items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
        <div className="card w-full max-w-md space-y-4 text-center">
          <h2 className="font-display text-2xl font-bold">Session Expired</h2>
          <p className="text-sm text-slate-500">
            Your reset session is invalid or has expired. Please start over.
          </p>
          <Link className="btn-primary inline-block" to="/forgot-password">
            Start Over
          </Link>
        </div>
      </section>
    );
  }

  async function onSubmit({ password: newPassword }) {
    try {
      await api.post("/auth/reset-password", { token: resetToken, newPassword });
      toast.success("Password reset successfully! Please log in.");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    }
  }

  return (
    <section className="flex min-h-screen items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
      <form
        className="card w-full max-w-md space-y-5"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div>
          <h2 className="font-display text-3xl font-bold">Set New Password</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a strong password for your account.
          </p>
        </div>

        <div className="space-y-1">
          <input
            id="rp-password"
            className="input"
            type="password"
            placeholder="New Password (min. 6 characters)"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 6, message: "Minimum 6 characters" },
            })}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <input
            id="rp-confirm"
            className="input"
            type="password"
            placeholder="Confirm New Password"
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (value) =>
                value === password || "Passwords do not match",
            })}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Resetting…" : "Reset Password"}
        </button>
      </form>
    </section>
  );
}