import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api } from "../services/api";

export default function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, ok: false, message: "Verifying your VIT-AP email..." });

  useEffect(() => {
    api.get(`/auth/verify/${token}`)
      .then(({ data }) => setState({ loading: false, ok: true, message: data.message }))
      .catch((error) => setState({ loading: false, ok: false, message: error.response?.data?.message || "Verification failed" }));
  }, [token]);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-4 py-16">
      <div className="card w-full text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${state.ok ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
          {state.loading ? <Loader2 className="animate-spin" /> : state.ok ? <CheckCircle2 /> : <XCircle />}
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold">Email verification</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-300">{state.message}</p>
        <Link className="btn-primary mt-8 inline-flex" to="/login">Go to login</Link>
      </div>
    </section>
  );
}
