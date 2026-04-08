import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import StudentCard from "../components/StudentCard";

const skillSuggestions = ["React", "Node.js", "Neo4j", "Python", "UI Design", "Machine Learning", "Java", "Data Analysis"];
const departmentSuggestions = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Business"];

export default function Discover() {
  const [filters, setFilters] = useState({ q: "", skill: "", department: "", year: "" });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <p className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200">{users.length} people found</p>
      </div>

      <div className="card mt-8 grid gap-4 md:grid-cols-5">
        <input className="input" placeholder="Search name" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
        <input className="input" list="skill-options" placeholder="Skill" value={filters.skill} onChange={(event) => setFilters({ ...filters, skill: event.target.value })} />
        <input className="input" list="department-options" placeholder="Department" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })} />
        <input className="input" type="number" placeholder="Year" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} />
        <button className="btn-primary" onClick={search}>Search</button>
      </div>
      <datalist id="skill-options">{skillSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="department-options">{departmentSuggestions.map((item) => <option key={item} value={item} />)}</datalist>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-sm dark:bg-white/10 md:col-span-2 lg:col-span-3">Loading students...</p>}
        {!loading && users.length === 0 && <p className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-sm dark:bg-white/10 md:col-span-2 lg:col-span-3">No matching students found. Try a broader skill or department.</p>}
        {users.map((student) => <StudentCard key={student.id} student={student} onAction={request} secondaryActionLabel={student.connectionStatus === "requestSent" ? "Cancel request" : undefined} onSecondaryAction={student.connectionStatus === "requestSent" ? cancelRequest : undefined} />)}
      </div>
    </section>
  );
}

