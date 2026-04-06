"use client";

import { useComparisonStore } from "../lib/store";
import { CropCalendarRecord } from "../lib/types";

export function ComparisonPanel({ calendars }: { calendars: CropCalendarRecord[] }) {
  const { selected, clear } = useComparisonStore();
  const selectedCalendars = calendars.filter((calendar) => selected.includes(calendar.cropName));

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Comparison mode</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Cross-crop planning snapshot</h2>
        </div>
        <button className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600" onClick={clear} type="button">
          Clear
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {selectedCalendars.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 md:col-span-3">
            Select crops from the timeline to compare sowing and harvesting overlaps.
          </div>
        ) : (
          selectedCalendars.map((calendar) => (
            <div key={calendar.id} className="rounded-2xl bg-slate-900 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">{calendar.cropCategory}</p>
              <h3 className="mt-2 text-xl font-semibold">{calendar.cropName}</h3>
              <p className="mt-2 text-sm text-slate-300">
                {calendar.regionName}, {calendar.stateName}
              </p>
              <p className="mt-1 text-xs text-slate-400">{calendar.countryName}</p>
              <div className="mt-5 space-y-3 text-sm">
                <p>Sowing: {calendar.sowingMonths.join(", ")}</p>
                <p>Growing: {calendar.growingMonths.join(", ")}</p>
                <p>Harvesting: {calendar.harvestingMonths.join(", ")}</p>
                <p>Season: {calendar.seasonName}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
