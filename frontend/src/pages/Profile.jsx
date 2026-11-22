import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Camera, Check, Trash2 } from "lucide-react";
import { Avatar, Field, PageHeader, TagInput } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { AVAILABILITY, DEPARTMENTS, GOALS, INTERESTS, SKILLS } from "../lib/constants";
import { apiErrorMessage } from "../lib/format";
import { api } from "../services/api";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function Checklist({ user }) {
  const items = [
    ["Profile photo", Boolean(user.avatarUrl)],
    ["Bio", Boolean(user.bio)],
    ["3+ skills", (user.skills?.length || 0) >= 3],
    ["Interests", (user.interests?.length || 0) > 0],
    ["A social link", Boolean(user.github || user.linkedin || user.instagram)]
  ];
  const done = items.filter(([, ok]) => ok).length;
  return (
    <div className="panel-pad">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Profile strength</p>
        <p className="font-mono text-xs text-ink-2">{done}/{items.length}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map(([label, ok]) => (
          <li key={label} className={`flex items-center gap-2 ${ok ? "text-ink-2" : "text-ink"}`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded-sm ${ok ? "bg-ok text-white" : "border border-line-strong"}`}>{ok && <Check size={11} strokeWidth={3} />}</span>
            <span className={ok ? "line-through decoration-line-strong" : ""}>{label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-3">Complete profiles get ranked higher in other students&apos; suggestions.</p>
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, control, formState: { isSubmitting, isDirty }, reset } = useForm({
    defaultValues: { ...user, skills: user.skills || [], interests: user.interests || [] }
  });

  async function onSubmit(values) {
    try {
      const { data } = await api.patch("/users/me", values);
      setUser(data.user);
      reset({ ...data.user, skills: data.user.skills || [], interests: data.user.interests || [] });
      toast.success("Profile saved");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not save your profile"));
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file");
    if (file.size > MAX_AVATAR_BYTES) return toast.error("Image must be under 2 MB");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const { data } = await api.post("/users/me/avatar", form);
      setUser(data.user);
      toast.success("Photo updated");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    const { data } = await api.delete("/users/me/avatar");
    setUser(data.user);
    toast.success("Photo removed");
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Profile" title="Edit your profile" description="This is what other students see when they find you." />

      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="panel-pad text-center">
            <div className="relative mx-auto w-fit">
              <Avatar name={user.name} src={user.avatarUrl} size="2xl" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink shadow-float hover:bg-sunken"
                aria-label="Change photo"
              >
                <Camera size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            </div>
            <p className="mt-5 text-lg font-semibold">{user.name}</p>
            {user.regNumber && <p className="font-mono text-xs text-ink-3">{user.regNumber}</p>}
            <p className="mt-1 text-sm text-ink-2">{user.email}</p>
            {uploading && <p className="mt-3 text-xs text-ink-3">Uploading…</p>}
            {user.avatarUrl && !uploading && (
              <button type="button" onClick={removeAvatar} className="btn btn-ghost btn-sm mt-3 text-bad hover:bg-bad-soft hover:text-bad"><Trash2 size={14} /> Remove photo</button>
            )}
          </div>
          <Checklist user={user} />
        </aside>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <section className="panel-pad space-y-4">
            <p className="eyebrow">About</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="pf-name" className="sm:col-span-2"><input id="pf-name" className="input" {...register("name")} /></Field>
              <Field label="Bio" htmlFor="pf-bio" className="sm:col-span-2"><textarea id="pf-bio" className="input" rows={3} placeholder="What are you working on or looking for?" {...register("bio")} /></Field>
              <Field label="Main goal" htmlFor="pf-goal"><select id="pf-goal" className="input" {...register("goal")}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select></Field>
              <Field label="Usually free" htmlFor="pf-avail"><select id="pf-avail" className="input" {...register("availability")}>{AVAILABILITY.map((a) => <option key={a}>{a}</option>)}</select></Field>
            </div>
          </section>

          <section className="panel-pad space-y-4">
            <p className="eyebrow">Academics</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Department" htmlFor="pf-dept" className="sm:col-span-3"><input id="pf-dept" className="input" list="pf-dept-list" {...register("department")} /></Field>
              <Field label="Year" htmlFor="pf-year"><input id="pf-year" className="input" type="number" min="1" max="5" {...register("year")} /></Field>
              <Field label="Graduating" htmlFor="pf-grad"><input id="pf-grad" className="input" type="number" {...register("graduationYear")} /></Field>
              <Field label="Club" htmlFor="pf-club"><input id="pf-club" className="input" {...register("club")} /></Field>
            </div>
            <datalist id="pf-dept-list">{DEPARTMENTS.map((d) => <option key={d} value={d} />)}</datalist>
          </section>

          <section className="panel-pad space-y-4">
            <p className="eyebrow">Skills &amp; interests</p>
            <Field label="Skills" htmlFor="pf-skills">
              <Controller name="skills" control={control} render={({ field }) => <TagInput id="pf-skills" value={field.value} onChange={field.onChange} suggestions={SKILLS} />} />
            </Field>
            <Field label="Interests" htmlFor="pf-interests">
              <Controller name="interests" control={control} render={({ field }) => <TagInput id="pf-interests" value={field.value} onChange={field.onChange} suggestions={INTERESTS} />} />
            </Field>
          </section>

          <section className="panel-pad space-y-4">
            <p className="eyebrow">Links</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="GitHub" hint="username" htmlFor="pf-gh"><input id="pf-gh" className="input" placeholder="octocat" {...register("github")} /></Field>
              <Field label="LinkedIn" hint="profile slug" htmlFor="pf-li"><input id="pf-li" className="input" placeholder="your-name" {...register("linkedin")} /></Field>
              <Field label="Instagram" hint="username" htmlFor="pf-ig"><input id="pf-ig" className="input" {...register("instagram")} /></Field>
            </div>
          </section>

          <div className="sticky bottom-20 z-10 flex items-center justify-end gap-3 rounded-lg border border-line bg-surface/95 p-3 backdrop-blur lg:bottom-4">
            {isDirty && <span className="mr-auto pl-2 text-sm text-ink-2">Unsaved changes</span>}
            <button className="btn btn-primary" disabled={isSubmitting || !isDirty}>{isSubmitting ? "Saving…" : "Save profile"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
