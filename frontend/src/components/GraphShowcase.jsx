import { motion } from "framer-motion";

const nodes = [
  { id: "you", label: "You", x: 200, y: 160, r: 28, color: "#3b82f6" },
  { id: "react", label: "React", x: 80, y: 60, r: 22, color: "#8b5cf6" },
  { id: "python", label: "Python", x: 340, y: 50, r: 22, color: "#8b5cf6" },
  { id: "aiclub", label: "AI Club", x: 60, y: 260, r: 22, color: "#f59e0b" },
  { id: "priya", label: "Priya", x: 360, y: 180, r: 28, color: "#10b981" },
  { id: "karthik", label: "Karthik", x: 180, y: 310, r: 28, color: "#10b981" },
  { id: "hackathon", label: "Hackathon", x: 380, y: 300, r: 22, color: "#f59e0b" },
  { id: "neo4j", label: "Neo4j", x: 320, y: 120, r: 18, color: "#8b5cf6" }
];

const edges = [
  ["you", "react"], ["you", "python"], ["you", "aiclub"], ["you", "priya"],
  ["you", "karthik"], ["priya", "python"], ["priya", "hackathon"],
  ["karthik", "aiclub"], ["karthik", "hackathon"], ["priya", "neo4j"],
  ["you", "neo4j"]
];

function getNode(id) {
  return nodes.find((n) => n.id === id);
}

export default function GraphShowcase() {
  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950 p-6 md:p-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
            Graph intelligence
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold text-white md:text-4xl">
            Powered by Neo4j graph database
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Every student, skill, club, and project is a node.
            Connections between them are relationships. Our graph algorithms traverse
            these links to find your ideal teammates — not just by keywords, but by
            real academic proximity.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[["Nodes", "Students, skills, clubs"], ["Edges", "Friendships, memberships"], ["Queries", "Shortest path matching"]].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-white/5 bg-white/5 p-3 text-center">
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="mt-1 text-[10px] text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <svg viewBox="0 0 440 360" className="h-auto w-full max-w-[440px]" aria-label="Neo4j graph visualization">
            {/* Edges */}
            {edges.map(([fromId, toId], i) => {
              const from = getNode(fromId);
              const to = getNode(toId);
              return (
                <motion.line
                  key={`${fromId}-${toId}`}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="rgba(148,163,184,0.15)"
                  strokeWidth={1.5}
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.5 }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node, i) => (
              <motion.g
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 200, damping: 15 }}
                style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              >
                {/* Glow */}
                <circle cx={node.x} cy={node.y} r={node.r + 6} fill={node.color} opacity={0.1} />
                {/* Node */}
                <circle cx={node.x} cy={node.y} r={node.r} fill="#0f172a" stroke={node.color} strokeWidth={2} />
                {/* Label */}
                <text
                  x={node.x} y={node.y + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fill="white" fontSize={node.r > 24 ? 11 : 9} fontWeight={600} fontFamily="Inter, system-ui, sans-serif"
                >
                  {node.label}
                </text>
              </motion.g>
            ))}

            {/* Pulse on "You" node */}
            <motion.circle
              cx={200} cy={160} r={34}
              fill="none" stroke="#3b82f6" strokeWidth={1}
              animate={{ r: [34, 50], opacity: [0.4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
