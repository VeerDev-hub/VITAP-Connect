import { Link } from "react-router-dom";
import { Github, GraduationCap, Network } from "lucide-react";

const links = [
  ["Dashboard", "/dashboard"],
  ["Discover", "/discover"],
  ["Projects", "/projects"],
  ["Admin", "/admin"]
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white/70 py-12 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <Link to="/" className="font-display text-2xl font-bold tracking-tight">
            VITAP<span className="text-blue-600">Connect</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            A React, Express, and Neo4j AuraDB project that helps students discover classmates through skills, clubs, mutual connections, and project goals.
          </p>
          <div className="mt-5 flex gap-3 text-slate-500 dark:text-slate-300">
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10"><Network size={18} /></div>
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10"><GraduationCap size={18} /></div>
            <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10"><Github size={18} /></div>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold">Explore</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
            {links.map(([label, href]) => <Link key={href} className="transition hover:text-blue-600" to={href}>{label}</Link>)}
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold">Viva points</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>Graph database: shortest paths and recommendations.</p>
            <p>Security: JWT, bcrypt, helmet, admin roles.</p>
            <p>Deployment: Vercel + Render + Neo4j AuraDB.</p>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-slate-200 px-4 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        <p>VITAP Connect - Built for Web Technology class project.</p>
        <p>React + Express + Neo4j AuraDB</p>
      </div>
    </footer>
  );
}
