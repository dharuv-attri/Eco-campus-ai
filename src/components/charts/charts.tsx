"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#f43f5e", "#64748b", "#34d399", "#fb923c"];

const axisStyle = { fontSize: 11, fill: "#8b9995" };
const gridStroke = "rgba(139,153,149,0.18)";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(139,153,149,0.22)",
  background: "rgba(255,255,255,0.97)",
  color: "#1d2624",
  fontSize: 12,
  boxShadow: "0 12px 32px -16px rgba(13,20,18,0.3)",
};

export function MonthlyTrendChart({
  data,
}: {
  data: Array<{ month: string; count: number; resolved: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="reportedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="count"
          name="Reported"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#reportedFill)"
        />
        <Area
          type="monotone"
          dataKey="resolved"
          name="Resolved"
          stroke="#0ea5e9"
          strokeWidth={2}
          strokeDasharray="4 3"
          fill="transparent"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const filtered = data.filter((item) => item.value > 0);
  if (!filtered.length) return <EmptyChart label="No status data yet" />;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
          {filtered.map((entry, index) => (
            <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data }: { data: Array<{ name: string; value: number }> }) {
  if (!data.length) return <EmptyChart label="No category data yet" />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
        <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={120}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" name="Reports" radius={[0, 6, 6, 0]} fill="#10b981" barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DepartmentBarChart({
  data,
}: {
  data: Array<{ department: string; total: number; resolved: number }>;
}) {
  if (!data.length) return <EmptyChart label="No department data yet" />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis
          dataKey="department"
          tick={{ ...axisStyle, fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-22}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="total" name="Total" fill="#a7f3d0" radius={[4, 4, 0, 0]} />
        <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed text-xs text-ink-400">
      {label}
    </div>
  );
}
