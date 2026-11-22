import { useEffect, useRef, useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import toast from "react-hot-toast";
import StudentCard from "../components/StudentCard";
import { EmptyState, PageHeader, Skeleton } from "../components/ui";
import { DEPARTMENTS, SKILLS } from "../lib/constants";
import { apiErrorMessage } from "../lib/format";
import { api } from "../services/api";

const EMPTY = { q: "", skill: "", department: "", year: "" };

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${active ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

export default function Discover() {
  const [filters, setFilters] = useState(EMPTY);
  const [users, setUsers] = useState(null);
  const debounce = useRef(null);

  async function search(next) {
    try {
      const { data } = await api.get("/users/search", { params: next });
      setUsers(data.users);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Search failed"));
      setUsers([]);
    }
  }

  // Live search: debounce typing, apply chip filters instantly.
  function update(patch, immediate = false) {
    const next = { ...filters, ...patch };
    setFilters(next);
    clearTimeout(debounce.current);
    if (immediate) search(next);
    else debounce.current = setTimeout(() => search(next), 300);
  }

  useEffect(() => {
    search(EMPTY);
    return () => clearTimeout(debounce.current);
  }, []);

  async function request(student) {
    await api.post("/connections/request", { toUserId: student.id });
    toast.success(`Request sent to ${student.name}`);
    setUsers((list) => list.map((u) => (u.id === student.id ? { ...u, connectionStatus: "requestSent" } : u)));
  }

  async function cancelRequest(student) {
    await api.post("/connections/cancel", { toUserId: student.id });
    toast.success("Request withdrawn");
    setUsers((list) => list.map((u) => (u.id === student.id ? { ...u, connectionStatus: "none" } : u)));
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader index="02" eyebrow="Discover" title="Find people by what they know" description="Search every student on campus by name, registration number, skill, department or year." />

      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" size={18} />
          <input
            className="input !py-3 pl-11 pr-10 text-base"
            placeholder="Search by name or reg. number, e.g. 23BCE"
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
            aria-label="Search students"
          />
          {filters.q && (
            <button type="button" className="icon-btn absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => update({ q: "" }, true)} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-baseline md:gap-x-4">
          <p className="eyebrow">Skill</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.slice(0, 10).map((s) => (
              <FilterChip key={s} active={filters.skill === s} onClick={() => update({ skill: filters.skill === s ? "" : s }, true)}>{s}</FilterChip>
            ))}
          </div>
          <p className="eyebrow">Dept.</p>
          <div className="flex flex-wrap gap-1.5">
            {DEPARTMENTS.map((d) => (
              <FilterChip key={d} active={filters.department === d} onClick={() => update({ department: filters.department === d ? "" : d }, true)}>{d}</FilterChip>
            ))}
          </div>
          <p className="eyebrow">Year</p>
          <div className="flex flex-wrap gap-1.5">
            {["1", "2", "3", "4"].map((y) => (
              <FilterChip key={y} active={filters.year === y} onClick={() => update({ year: filters.year === y ? "" : y }, true)}>Year {y}</FilterChip>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <p className="font-mono text-xs text-ink-3">{users ? `${users.length} student${users.length === 1 ? "" : "s"}` : "Searching…"}</p>
        {hasFilters && <button type="button" className="btn btn-ghost btn-sm" onClick={() => update(EMPTY, true)}>Reset filters</button>}
      </div>

      {!users ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : users.length === 0 ? (
        <EmptyState icon={SearchX} title="No one matches that yet">Try a broader skill or clear a filter.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onAction={request}
              secondaryActionLabel={student.connectionStatus === "requestSent" ? "Withdraw" : undefined}
              onSecondaryAction={student.connectionStatus === "requestSent" ? cancelRequest : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
