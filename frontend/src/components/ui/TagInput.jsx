import { useState } from "react";
import { Plus, X } from "lucide-react";

// Chip input: type + Enter/comma to add, click suggestions, Backspace removes last.
export default function TagInput({ id, value = [], onChange, suggestions = [], placeholder = "Type and press Enter", max = 12 }) {
  const [draft, setDraft] = useState("");
  const tags = Array.isArray(value) ? value : String(value || "").split(",").map((t) => t.trim()).filter(Boolean);

  function add(raw) {
    const next = raw.trim().replace(/,$/, "");
    if (!next || tags.length >= max) return;
    if (tags.some((t) => t.toLowerCase() === next.toLowerCase())) return;
    onChange([...tags, next]);
    setDraft("");
  }

  function remove(tag) {
    onChange(tags.filter((t) => t !== tag));
  }

  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && tags.length) {
      remove(tags.at(-1));
    }
  }

  const remaining = suggestions.filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 py-1.5 focus-within:border-ink">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded bg-ink px-2 py-1 text-xs font-medium text-bg">
            {tag}
            <button type="button" onClick={() => remove(tag)} className="opacity-60 hover:opacity-100" aria-label={`Remove ${tag}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          placeholder={tags.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-ink-3"
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.slice(0, 10).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded border border-dashed border-line-strong px-2 py-0.5 text-xs text-ink-2 hover:border-ink-3 hover:text-ink"
            >
              <Plus size={11} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
