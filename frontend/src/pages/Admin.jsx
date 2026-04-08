import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function Admin() {
  const [users, setUsers] = useState([]);

  async function load() {
    const { data } = await api.get("/admin/users");
    setUsers(data.users);
  }

  async function updateStatus(userId, status) {
    await api.patch(`/admin/users/${userId}/status`, { status });
    toast.success("User status updated");
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">Admin Moderation</h1>
      <div className="card mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 dark:border-white/10"><th className="p-3">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 dark:border-white/5">
                <td className="p-3 font-semibold">{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.status || "active"}</td>
                <td><button className="btn-secondary !px-3 !py-2" onClick={() => updateStatus(user.id, user.status === "blocked" ? "active" : "blocked")}>{user.status === "blocked" ? "Unblock" : "Block"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
