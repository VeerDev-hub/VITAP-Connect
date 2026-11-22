import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Field, PageHeader } from "../components/ui";
import { apiErrorMessage } from "../lib/format";
import { api } from "../services/api";

const SCALE = [
  [1, "Frustrating"],
  [2, "Meh"],
  [3, "Okay"],
  [4, "Good"],
  [5, "Love it"]
];

export default function Feedback() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!rating) return toast.error("Pick a rating first");
    if (!message.trim()) return toast.error("Tell us a little more");
    setSubmitting(true);
    try {
      await api.post("/feedback", { rating, message });
      toast.success("Thanks — this goes straight to the team");
      navigate("/dashboard");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not send feedback"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader eyebrow="Feedback" title="How's VITAP Connect working for you?" description="Bugs, ideas, complaints — all of it helps. Only the admins can read this." />
      <form onSubmit={submit} className="panel-pad space-y-6">
        <fieldset>
          <legend className="label">Overall</legend>
          <div className="grid grid-cols-5 gap-2">
            {SCALE.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-pressed={rating === value}
                className={`flex flex-col items-center gap-1 rounded-md border px-2 py-3 transition-colors ${rating === value ? "border-ink bg-ink text-bg" : "border-line-strong hover:border-ink-3"}`}
              >
                <span className="font-display text-2xl font-semibold">{value}</span>
                <span className={`text-[11px] ${rating === value ? "text-bg/70" : "text-ink-3"}`}>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="What should we know?" htmlFor="fb-msg">
          <textarea id="fb-msg" className="input" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What worked, what didn't, what you wish it did…" />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" disabled={submitting}>{submitting ? "Sending…" : "Send feedback"}</button>
        </div>
      </form>
    </div>
  );
}
