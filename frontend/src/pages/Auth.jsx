import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ShieldCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const skills = ["React", "Node.js", "Express", "Neo4j", "Python", "Java", "UI Design", "Machine Learning", "Data Analysis", "Tailwind CSS"];
const interests = ["AI", "Web Development", "Hackathons", "Open Source", "Startups", "Cloud", "Cybersecurity", "Mobile Apps", "Research"];
const departments = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Business"];
const collegeDomain = "@vitapstudent.ac.in";

export default function Auth({ mode }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { register: field, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: { year: 3, graduationYear: new Date().getFullYear() + 1 } });
  const password = watch("password");

  async function onSubmit(values) {
    try {
      if (isRegister && values.password !== values.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (isRegister) {
        await register(values);
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
    <section className="relative overflow-hidden px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(37,99,235,0.24),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(20,184,166,0.2),transparent_28%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="card bg-slate-950 text-white dark:bg-slate-900">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100"><Sparkles size={16} /> VITAP student network</span>
          <h1 className="mt-6 font-display text-5xl font-bold">{isRegister ? "Join VITAP Connect with your college email." : "Login to VITAP Connect."}</h1>
          <p className="mt-5 leading-7 text-slate-300">{isRegister ? "Use your VIT-AP student mail to create your account instantly and start discovering teammates, friends, and projects." : "Sign in with your VIT-AP student account to continue your chats, projects, and campus connections."}</p>
          <div className="mt-8 grid gap-4 text-sm text-slate-200">
            <p className="flex items-center gap-3"><ShieldCheck className="text-emerald-300" /> College email restriction only</p>
            <p className="flex items-center gap-3"><ShieldCheck className="text-blue-300" /> Instant account access after signup</p>
          </div>
        </div>

        <form className="card space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <h2 className="font-display text-3xl font-bold">{isRegister ? "Create account" : "Welcome back"}</h2>
            <p className="mt-2 text-sm text-slate-500">{isRegister ? `Use an email ending with ${collegeDomain}.` : "Login with your registered VIT-AP email and password."}</p>
          </div>

          {isRegister && <input className="input" placeholder="Full name" {...field("name", { required: "Name is required" })} />}
          <input className="input" type="email" placeholder={`name${collegeDomain}`} {...field("email", { required: "Email is required", validate: (value) => !isRegister || value.toLowerCase().endsWith(collegeDomain) || `Use your ${collegeDomain} email` })} />
          <input className="input" type="password" placeholder="Password" {...field("password", { required: "Password is required", minLength: { value: 6, message: "Use at least 6 characters" } })} />
          {isRegister && <input className="input" type="password" placeholder="Confirm password" {...field("confirmPassword", { validate: (value) => value === password || "Passwords do not match" })} />}
          {isRegister && (
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="input" list="department-list" placeholder="Department" {...field("department", { required: true })} />
              <input className="input" type="number" min="1" max="5" placeholder="Current year" {...field("year", { required: true })} />
              <input className="input" type="number" min="2026" max="2035" placeholder="Graduation year" {...field("graduationYear", { required: true })} />
              <input className="input" placeholder="Club or society" {...field("club")} />
              <input className="input sm:col-span-2" list="skill-list" placeholder="Skills: React, Node.js, Neo4j" {...field("skills", { required: true })} />
              <input className="input sm:col-span-2" list="interest-list" placeholder="Interests: AI, Web Development" {...field("interests", { required: true })} />
              <select className="input" {...field("goal")}><option>Find project partners</option><option>Join hackathon teams</option><option>Learn from seniors</option><option>Build portfolio projects</option></select>
              <select className="input" {...field("availability")}><option>Evenings</option><option>Weekends</option><option>After classes</option><option>Flexible</option></select>
              <textarea className="input sm:col-span-2" rows="3" placeholder="Short bio: what do you want to build?" {...field("bio")} />
            </div>
          )}
          {(errors.email || errors.confirmPassword || errors.password) && <p className="text-sm font-semibold text-rose-600">{errors.email?.message || errors.confirmPassword?.message || errors.password?.message}</p>}
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Please wait..." : isRegister ? "Create account" : "Login"}</button>
          <p className="text-center text-sm text-slate-500">
            {isRegister ? "Already have an account?" : "New to VITAP Connect?"} <Link className="font-semibold text-blue-600" to={isRegister ? "/login" : "/register"}>{isRegister ? "Login" : "Register"}</Link>
          </p>
        </form>
      </div>
      <datalist id="skill-list">{skills.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="interest-list">{interests.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="department-list">{departments.map((item) => <option key={item} value={item} />)}</datalist>
    </section>
  );
}
