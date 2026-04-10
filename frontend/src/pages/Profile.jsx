import { useState } from "react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [avatar, setAvatar] = useState(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { ...user, skills: user.skills?.join(", "), interests: user.interests?.join(", ") } });

  async function onSubmit(values) {
    const { data } = await api.patch("/users/me", values);
    setUser(data.user);
    toast.success("Profile updated");
  }

  async function uploadAvatar() {
    if (!avatar) return;
    const form = new FormData();
    form.append("avatar", avatar);
    const { data } = await api.post("/users/me/avatar", form);
    setUser(data.user);
    toast.success("Profile image uploaded");
  }

  async function removeAvatar() {
    const { data } = await api.delete("/users/me/avatar");
    setUser(data.user);
    setAvatar(null);
    toast.success("Profile image removed");
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <span className="tag">Profile strength matters</span>
      <h1 className="mt-3 font-display text-4xl font-bold">Profile Editor</h1>
      <form className="card mt-8 grid gap-5 md:grid-cols-[0.7fr_1.3fr]" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <img className="h-40 w-40 rounded-[2rem] object-cover" src={user.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.name)}`} alt={user.name} />
          <input className="input mt-4" type="file" accept="image/*" onChange={(event) => setAvatar(event.target.files[0])} />
          <button className="btn-secondary mt-3 w-full" type="button" onClick={uploadAvatar}>Upload image</button>
          {user.avatarUrl && <button className="mt-3 w-full rounded-full border border-rose-200 bg-rose-50 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200" type="button" onClick={removeAvatar}>Remove avatar</button>}
          <p className="mt-4 rounded-3xl bg-slate-100 p-4 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100">Complete profiles help you find better study partners and project collaborators.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <input className="input" placeholder="Name" {...register("name")} />
          <input className="input" placeholder="Department" {...register("department")} />
          <input className="input" type="number" placeholder="Current year" {...register("year")} />
          <input className="input" type="number" placeholder="Graduation year" {...register("graduationYear")} />
          <input className="input" placeholder="Club" {...register("club")} />
          <select className="input" {...register("goal")}>
            <option>Find project partners</option>
            <option>Join hackathon teams</option>
            <option>Learn from seniors</option>
            <option>Build portfolio projects</option>
          </select>
          <select className="input" {...register("availability")}>
            <option>Evenings</option>
            <option>Weekends</option>
            <option>After classes</option>
            <option>Flexible</option>
          </select>
          <input className="input" placeholder="Skills comma separated" {...register("skills")} />
          <input className="input" placeholder="Interests comma separated" {...register("interests")} />
          <input className="input" placeholder="GitHub Username" {...register("github")} />
          <input className="input" placeholder="LinkedIn Profile Slug" {...register("linkedin")} />
          <input className="input" placeholder="Instagram Username" {...register("instagram")} />
          <textarea className="input sm:col-span-2" rows="4" placeholder="Bio" {...register("bio")} />
          <button className="btn-primary sm:col-span-2" disabled={isSubmitting}>Save profile</button>
        </div>
      </form>
    </section>
  );
}


