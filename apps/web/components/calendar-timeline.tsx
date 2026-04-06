"use client";

import { MONTH_LABELS } from "@agri/shared";
import { useComparisonStore } from "../lib/store";
import { CropCalendarRecord } from "../lib/types";

const monthClasses = {
  sowing: "bg-emerald-500/90 text-white",
  growing: "bg-amber-300 text-amber-950",
  harvesting: "bg-orange-500 text-white",
  empty: "bg-slate-100 text-slate-400"
};

export function CalendarTimeline({
  calendars,
  hasActiveFilters
}: {
  calendars: CropCalendarRecord[];
  hasActiveFilters: boolean;
}) {
  const { selected, toggle } = useComparisonStore();

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Monthly lifecycle</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Crop calendar explorer</h2>
        </div>
        <p className="text-sm text-slate-600">Select up to three crops for comparison mode.</p>
      </div>
      {!hasActiveFilters ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-lg font-medium text-slate-900">Apply filters to view crop calendars</p>
          <p className="mt-2 text-sm text-slate-600">
            Choose country, region, crop, or season, then click `Apply filters` to load matching records.
          </p>
        </div>
      ) : null}
      {hasActiveFilters ? (
      <div className="overflow-x-auto">
        <div className="min-w-[920px] space-y-3">
          <div className="grid grid-cols-[220px_repeat(12,minmax(0,1fr))] gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            <div>Crop / Region</div>
            {MONTH_LABELS.map((month) => (
              <div key={month} className="text-center">
                {month}
              </div>
            ))}
          </div>
          {calendars.map((calendar) => {
            const isSelected = selected.includes(calendar.cropName);

            return (
              <button
                key={calendar.id}
                className={`grid w-full grid-cols-[220px_repeat(12,minmax(0,1fr))] gap-2 rounded-[1.5rem] border px-3 py-3 text-left transition ${
                  isSelected ? "border-slate-900 bg-slate-900/5" : "border-slate-200 bg-white"
                }`}
                onClick={() => toggle(calendar.cropName)}
                type="button"
              >
                <div>
                  <p className="font-semibold text-slate-900">{calendar.cropName}</p>
                  <p className="text-sm text-slate-600">
                    {calendar.regionName}, {calendar.stateName}
                  </p>
                  <p className="text-xs text-slate-500">{calendar.countryName}</p>
                </div>
                {Array.from({ length: 12 }, (_, index) => {
                  const month = index + 1;
                  let mode: keyof typeof monthClasses = "empty";

                  if (calendar.sowingMonths.includes(month)) {
                    mode = "sowing";
                  } else if (calendar.growingMonths.includes(month)) {
                    mode = "growing";
                  } else if (calendar.harvestingMonths.includes(month)) {
                    mode = "harvesting";
                  }

                  return (
                    <div
                      key={`${calendar.id}-${month}`}
                      className={`flex h-12 items-center justify-center rounded-2xl text-xs font-semibold ${monthClasses[mode]}`}
                      title={`${calendar.cropName} • ${MONTH_LABELS[index]} • ${mode}`}
                    >
                      {mode === "empty" ? "•" : ""}
                    </div>
                  );
                })}
              </button>
            );
          })}
        </div>
      </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Sowing</span>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Growing</span>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">Harvesting</span>
      </div>
    </section>
  );
}
