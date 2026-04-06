"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AnalyticsChart({ data }: { data: { cropName: string; usageCount: number }[] }) {
  return (
    <section id="analytics" className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Usage analytics</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">Popular crops by query volume</h2>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="cropName" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="usageCount" fill="#4d7c0f" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

