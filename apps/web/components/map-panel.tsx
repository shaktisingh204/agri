"use client";

import dynamic from "next/dynamic";
import { Region } from "../lib/types";

const RegionMapClient = dynamic(() => import("./region-map-client").then((mod) => mod.RegionMapClient), {
  ssr: false
});

export function MapPanel({ regions }: { regions: Region[] }) {
  return (
    <section id="coverage" className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Spatial intelligence</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">Agro-ecological zone coverage</h2>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200">
          <RegionMapClient regions={regions} />
        </div>
        <div className="space-y-3">
          {regions.map((region) => (
            <div key={region.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{region.name}</p>
              <p className="text-sm text-slate-600">{region.agroZoneName}</p>
              <p className="mt-1 text-sm text-emerald-700">{region.country.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
