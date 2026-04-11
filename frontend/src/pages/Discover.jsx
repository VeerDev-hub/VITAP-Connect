import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { SlidersHorizontal, LayoutGrid, LayoutList } from "lucide-react";
import { api } from "../services/api";
import StudentCard from "../components/StudentCard";

const skillSuggestions = ["React", "Node.js", "Neo4j", "Python", "UI Design", "Machine Learning", "Java", "Data Analysis"];
const departmentSuggestions = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Business"];

export default function Discover() {
  const [filters, setFilters] = useState({ q: "", skill: "", department: "", year: "" });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("single"); // "single" | "double"

  async function search() {
    setLoading(true);
    const { data } = await api.get("/users/search", { params: filters });
    setUsers(data.users);
    setLoading(false);
  }

  async function request(student) {
    await api.post("/connections/request", { toUserId: student.id });
    toast.success(`Connection request sent to ${student.name}`);
    setUsers((current) => current.map((item) => item.id === student.id ? { ...item, connectionStatus: "requestSent" } : item));
  }

  async function cancelRequest(student) {
    await api.post("/connections/cancel", { toUserId: student.id });
    toast.success(`Connection request cancelled for ${student.name}`);
    setUsers((current) => current.map((item) => item.id === student.id ? { ...item, connectionStatus: "none" } : item));
  }

  useEffect(() => { search(); }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="tag">People discovery</span>
          <h1 className="mt-3 font-display text-4xl font-bold">Search & Discover</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Find new collaborators, see existing friends, and avoid duplicate connection requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200">{users.length} found</p>
          
          <div className="flex items-center rounded-full bg-white shadow-sm p-1 dark:bg-slate-800">
            <button 
              onClick={() => setViewMode("single")} 
              className={`p-2 rounded-full transition ${viewMode === "single" ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`} 
              aria-label="Single Column View"
              title="Single View"
            >
              <LayoutList size={16} />
            </button>
            <button 
              onClick={() => setViewMode("double")} 
              className={`p-2 rounded-full transition ${viewMode === "double" ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              aria-label="Double Column View"
              title="Double View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="card mt-8 flex flex-col gap-4">
        <div className="flex gap-2 w-full">
          <input className="input flex-1" placeholder="Search by Registration Number or Name..." value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} onKeyDown={(e) => {if(e.key === 'Enter') search()}} />
          <button className={`p-3 rounded-xl border flex items-center justify-center transition-colors ${showFilters ? 'bg-slate-200 border-slate-300 text-slate-900 dark:bg-white/20 dark:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'}`} onClick={() => setShowFilters(!showFilters)} aria-label="Toggle filters">
            <SlidersHorizontal size={20} />
          </button>
          <button className="btn-primary" onClick={search}>Search</button>
        </div>
        
        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-3 pt-4 border-t border-slate-100 dark:border-white/10 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Skill</label>
              <input className="input" list="skill-options" placeholder="e.g. React" value={filters.skill} onChange={(event) => setFilters({ ...filters, skill: event.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Department</label>
              <input className="input" list="department-options" placeholder="e.g. Computer Science" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Year</label>
              <input className="input" type="number" placeholder="e.g. 3" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} />
            </div>
            <datalist id="skill-options">{skillSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
            <datalist id="department-options">{departmentSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
          </div>
        )}
      </div>

      <div className={`mt-8 grid gap-4 transition-all duration-300 ${viewMode === "double" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
        {loading && <p className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-sm dark:bg-white/10 md:col-span-2 lg:col-span-3">Loading students...</p>}
        {!loading && users.length === 0 && <p className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-sm dark:bg-white/10 md:col-span-2 lg:col-span-3">No matching students found. Try evaluating names or broader skills.</p>}
        {users.map((student) => (
          <StudentCard 
            key={student.id} 
            student={student} 
            compact={viewMode === "double"}
            onAction={request} 
            secondaryActionLabel={student.connectionStatus === "requestSent" ? "Cancel request" : undefined} 
            onSecondaryAction={student.connectionStatus === "requestSent" ? cancelRequest : undefined} 
          />
        ))}
      </div>
    </section>
  );
}

