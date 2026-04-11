import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";

const links = [
  ["Dashboard", "/dashboard"],
  ["Discover", "/discover"],
  ["Collaborations", "/collaborations"]
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white/70 py-12 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <Link to="/" className="font-display text-2xl font-bold tracking-tight">
            VITAP<span className="text-slate-900 dark:text-slate-100">Connect</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            VITAP Connect is a student collaboration platform that helps VITAP University students find teammates, build study groups, and work together on academic projects and hackathons.
          </p>
          <div className="mt-5 flex gap-3 text-slate-500 dark:text-slate-300">
            <a href="https://github.com/VeerDev-hub" className="rounded-2xl border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5" target="_blank" rel="noopener noreferrer">
              <Github size={18} />
            </a>
            <a href="https://www.linkedin.com/in/veer-pratap-singh-99a368310/" className="rounded-2xl border border-slate-200 p-3 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5" target="_blank" rel="noopener noreferrer">
              <Linkedin size={18} />
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold">Explore</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
            {links.map(([label, href]) => <Link key={href} className="transition hover:text-slate-900 dark:hover:text-slate-100" to={href}>{label}</Link>)}
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold">Features</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>Find students by skills and interests</p>
            <p>Create and join project teams</p>
            <p>Real-time chat and video calls</p>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-slate-200 px-4 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        <p>Made with ❤️ by Veer</p>
        <p>© 2026 VITAP Connect - Student Collaboration Platform</p>
      </div>
    </footer>
  );
}
