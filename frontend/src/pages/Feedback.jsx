import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, MessageSquare, Send, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) return toast.error("Please select a rating");
    if (!message.trim()) return toast.error("Please enter a message");

    setIsSubmitting(true);
    try {
      await api.post("/feedback", { rating, message });
      toast.success("Thank you for your feedback!", { icon: "🚀" });
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-xl animate-fade-in text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl dark:bg-slate-800">
          <MessageSquare size={32} />
        </div>
        
        <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">
          Help us build the <span className="text-indigo-500">future</span> of VITAP Connect.
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
          Your feedback helps us create a better experience for the entire student community.
        </p>

        <div className="mt-10 card bg-white dark:bg-slate-900 shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="text-sm font-bold uppercase tracking-widest text-slate-400">Rate your experience</label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      size={40}
                      className={`transition-colors duration-300 ${
                        (hover || rating) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200 dark:text-slate-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm font-semibold text-slate-400">
                {rating === 1 && "Disappointing 😞"}
                {rating === 2 && "Could be better 😐"}
                {rating === 3 && "It's okay 🙂"}
                {rating === 4 && "Great experience! 😀"}
                {rating === 5 && "Absolutely love it! 😍"}
              </p>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-sm font-bold uppercase tracking-widest text-slate-400 px-1">Detailed Feedback</label>
              <textarea
                required
                rows="4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What do you think about the matching, chat, or project features? Any suggestions?"
                className="input min-h-[120px] resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
              >
                {isSubmitting ? (
                  "Sharing your thoughts..."
                ) : (
                  <>Submit Feedback <Send size={20} /></>
                )}
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium pt-2">
              <Sparkles size={14} className="text-indigo-400" />
              Directly goes to the development team
            </div>
          </form>
        </div>
        
        <button 
          onClick={() => navigate("/dashboard")}
          className="mt-8 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Go back to Dashboard
        </button>
      </div>
    </div>
  );
}
