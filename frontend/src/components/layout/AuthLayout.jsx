import { Logo } from "../ui";
import ThemeToggle from "./ThemeToggle";

// Split layout for login / register / password flows.
export default function AuthLayout({ aside, children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="grid-paper relative hidden flex-col justify-between border-r border-line bg-sunken p-10 lg:flex">
        <Logo />
        <div className="max-w-md">{aside}</div>
        <p className="font-mono text-[11px] text-ink-3">VIT-AP University · Amaravati</p>
      </aside>
      <div className="flex flex-col">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8">
          <span className="lg:invisible"><Logo /></span>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:px-8 lg:items-center">
          <div className="w-full max-w-md animate-fade-up">{children}</div>
        </div>
      </div>
    </div>
  );
}
