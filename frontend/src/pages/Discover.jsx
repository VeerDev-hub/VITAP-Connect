import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { SlidersHorizontal, LayoutGrid, LayoutList, Search, Sparkles, FilterX } from "lucide-react";
import { api } from "../services/api";
import StudentCard from "../components/StudentCard";
import { motion, AnimatePresence } from "framer-motion";

const skillSuggestions = ["React", "Node.js", "Neo4j", "Python", "UI Design", "Machine Learning", "Java", "Data Analysis"];
const departmentSuggestions = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Business"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Discover() {
  const [filters, setFilters] = useState({ q: "", skill: "", department: "", year: "" });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("double"); // Default to grid for better discovery

  async function search() {
    setLoading(true);
    const { data } = await api.get("/users/search", { params: filters });
    setUsers(data.users);
    setLoading(false);
  }

  async function request(student) {
    await api.post("/connections/request", { toUserId: student.id });
    toast.success(`Request sent to ${student.name}`);
    setUsers((current) => current.map((item) => item.id === student.id ? { ...item, connectionStatus: "requestSent" } : item));
  }

  async function cancelRequest(student) {
    await api.post("/connections/cancel", { toUserId: student.id });
    toast.success(`Request cancelled`);
    setUsers((current) => current.map((item) => item.id === student.id ? { ...item, connectionStatus: "none" } : item));
  }

  useEffect(() => { search(); }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="max-w-3xl">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-3 font-display text-5xl sm:text-7xl font-black tracking-tighter"
          >
            Find your <span className="text-indigo-600">Perfect Match</span>
          </motion.h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            Explore the sharpest minds across VIT-AP. From machine learning experts to UI designers, your future teammate is just a search away.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl bg-slate-100 shadow-inner p-1 dark:bg-slate-800">
            <button 
              onClick={() => setViewMode("single")} 
              className={`p-2 rounded-xl transition-all ${viewMode === "single" ? "bg-white text-slate-930 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-white/10" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`} 
              aria-label="Single Column View"
            >
              <LayoutList size={22} />
            </button>
            <button 
              onClick={() => setViewMode("double")} 
              className={`p-2 rounded-xl transition-all ${viewMode === "double" ? "bg-white text-slate-930 dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-white/10" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              aria-label="Double Column View"
            >
              <LayoutGrid size={22} />
            </button>
          </div>
          <p className="hidden sm:block text-sm font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-4 py-3 rounded-2xl border border-slate-200/50 dark:border-white/5">
            {users.length} Results
          </p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="card mt-10 p-2 sm:p-3 overflow-visible"
      >
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
              className="input !pl-12 !py-4 !rounded-2xl border-transparent bg-slate-50 dark:bg-white/5 group-focus-within:bg-white dark:group-focus-within:bg-slate-900 group-focus-within:ring-2 ring-indigo-500/20 transition-all text-base" 
              placeholder="Search by ID, Skills, or Name..." 
              value={filters.q} 
              onChange={(event) => setFilters({ ...filters, q: event.target.value })} 
              onKeyDown={(e) => {if(e.key === 'Enter') search()}} 
            />
          </div>
          <div className="flex gap-2">
            <button 
              className={`px-5 rounded-2xl border flex items-center justify-center gap-2 font-bold transition-all ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'}`} 
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">Refine</span>
            </button>
            <button className="btn-primary !px-8 !py-4 active:scale-95 transition-all text-base" onClick={search}>Discover</button>
          </div>
        </div>
        
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid gap-4 sm:grid-cols-3 p-4 mt-2 border-t border-slate-100 dark:border-white/5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Primary Skill</label>
                  <input className="input !rounded-xl" list="skill-options" placeholder="e.g. React" value={filters.skill} onChange={(event) => setFilters({ ...filters, skill: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Department</label>
                  <input className="input !rounded-xl" list="department-options" placeholder="e.g. Mechanical" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Academic Year</label>
                  <input className="input !rounded-xl" type="number" placeholder="1-4" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} />
                </div>
                <datalist id="skill-options">{skillSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
                <datalist id="department-options">{departmentSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
              </div>
              <div className="px-4 pb-4 flex justify-end">
                <button className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest flex items-center gap-1" onClick={() => { setFilters({q:"",skill:"",department:"",year:""}); search(); }}>
                  <FilterX size={14} /> Reset Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={loading ? 'loading' : 'results'}
        className={`mt-10 grid gap-6 transition-all duration-500 ${viewMode === "double" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}
      >
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-48 card animate-pulse bg-slate-100 dark:bg-white/5 rounded-3xl" />)
        ) : users.length === 0 ? (
          <div className="col-span-full py-24 text-center card border-dashed bg-slate-50 dark:bg-white/5">
            <Search className="mx-auto text-slate-300 mb-4" size={56} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Shadow realm? No users found.</h3>
            <p className="text-slate-500 mt-2">Try broader skills or check your spelling. The whole campus is waiting!</p>
          </div>
        ) : (
          users.map((student) => (
            <StudentCard 
              key={student.id} 
              student={student} 
              compact={viewMode === "double"}
              onAction={request} 
              secondaryActionLabel={student.connectionStatus === "requestSent" ? "Cancel request" : undefined} 
              onSecondaryAction={student.connectionStatus === "requestSent" ? cancelRequest : undefined} 
            />
          ))
        )}
      </motion.div>
    </section>
  );
}

