import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import StudentCard from "../components/StudentCard";
import { Avatar, EmptyState, PageHeader, SectionTitle, Skeleton } from "../components/ui";
import { apiErrorMessage } from "../lib/format";
import { api } from "../services/api";

function RequestRow({ student, onAccept, onReject }) {
  const [busy, setBusy] = useState(false);
  const run = (fn) => async () => {
    setBusy(true);
    try {
      await fn(student);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={student.name} src={student.avatarUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{student.name}</p>
          <p className="truncate text-sm text-ink-2">
            {student.department} · Year {student.year}
            {student.skills?.length > 0 && <span className="text-ink-3"> · {student.skills.slice(0, 3).join(", ")}</span>}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary btn-sm flex-1 sm:flex-none" onClick={run(onReject)} disabled={busy}><X size={14} /> Ignore</button>
        <button type="button" className="btn btn-primary btn-sm flex-1 sm:flex-none" onClick={run(onAccept)} disabled={busy}><Check size={14} /> Accept</button>
      </div>
    </div>
  );
}

export default function Connections() {
  const [connections, setConnections] = useState(null);

  async function load() {
    try {
      const { data } = await api.get("/connections");
      setConnections(data);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load your network"));
    }
  }

  useEffect(() => { load(); }, []);

  async function accept(student) {
    await api.post("/connections/accept", { fromUserId: student.id });
    toast.success(`You're now connected with ${student.name}`);
    load();
  }

  async function reject(student) {
    await api.post("/connections/reject", { fromUserId: student.id });
    toast.success("Request ignored");
    load();
  }

  async function removeFriend(student) {
    if (!window.confirm(`Remove ${student.name} from your connections?`)) return;
    await api.post("/connections/remove", { friendId: student.id });
    toast.success(`${student.name} removed`);
    load();
  }

  async function blockFriend(student) {
    if (!window.confirm(`Block ${student.name}? They won't be able to find or message you.`)) return;
    await api.post("/connections/block", { friendId: student.id });
    toast.success(`${student.name} blocked`);
    load();
  }

  const requests = connections?.requests || [];
  const accepted = connections?.accepted || [];

  return (
    <div className="space-y-10">
      <PageHeader
        index="03"
        eyebrow="Network"
        title="Your connections"
        description="People you can message and call directly. Accept requests to add them here."
        actions={<Link to="/discover" className="btn btn-secondary">Find more people</Link>}
      />

      {requests.length > 0 && (
        <section>
          <SectionTitle title="Waiting for you" count={requests.length} />
          <div className="panel divide-y divide-line border-warn/40">
            {requests.map((s) => <RequestRow key={s.id} student={s} onAccept={accept} onReject={reject} />)}
          </div>
        </section>
      )}

      <section>
        <SectionTitle title="Connected" count={connections ? accepted.length : undefined} />
        {!connections ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-52" />)}</div>
        ) : accepted.length === 0 ? (
          <EmptyState icon={Users} title="No connections yet" action={<Link to="/discover" className="btn btn-primary btn-sm">Discover students</Link>}>
            Send a few requests to classmates who share your skills.
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {accepted.map((s) => (
              <StudentCard
                key={s.id}
                student={{ ...s, connectionStatus: "friend" }}
                secondaryActionLabel="Remove"
                onSecondaryAction={removeFriend}
                dangerActionLabel="Block"
                onDangerAction={blockFriend}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
