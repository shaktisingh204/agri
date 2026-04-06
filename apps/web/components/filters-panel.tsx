import { Country, Crop, Region } from "../lib/types";

interface FiltersPanelProps {
  countries: Country[];
  regions: Region[];
  crops: Crop[];
  selected: {
    country?: string;
    state?: string;
    region?: string;
    crop?: string;
    season?: string;
    month?: string;
  };
}

export function FiltersPanel({ countries, regions, crops, selected }: FiltersPanelProps) {
  const states = Array.from(new Set(regions.map((region) => region.agroZoneName))).sort((left, right) =>
    left.localeCompare(right)
  );
  const filteredRegions = selected.state
    ? regions.filter((region) => region.agroZoneName === selected.state)
    : regions;
  const seasons = ["Main Rainy Season", "Long Rains", "Dry Season"];
  const months = [
    { value: "1", label: "Jan" },
    { value: "2", label: "Feb" },
    { value: "3", label: "Mar" },
    { value: "4", label: "Apr" },
    { value: "5", label: "May" },
    { value: "6", label: "Jun" },
    { value: "7", label: "Jul" },
    { value: "8", label: "Aug" },
    { value: "9", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" }
  ];

  return (
    <form action="/" className="grid gap-4 rounded-[2rem] border border-white/60 bg-white/85 p-5 shadow-soft backdrop-blur md:grid-cols-6" method="GET">
      <label className="space-y-2 text-sm font-medium text-slate-700">
        Country
        <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" defaultValue={selected.country} name="country">
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country.id} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        State
        <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" defaultValue={selected.state} name="state">
          <option value="">All states</option>
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        Region
        <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" defaultValue={selected.region} name="region">
          <option value="">All regions</option>
          {filteredRegions.map((region) => (
            <option key={region.id} value={region.name}>
              {region.name}, {region.agroZoneName}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        Crop
        <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" defaultValue={selected.crop} name="crop">
          <option value="">All crops</option>
          {crops.map((crop) => (
            <option key={crop.id} value={crop.slug}>
              {crop.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        Season
        <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" defaultValue={selected.season} name="season">
          <option value="">All seasons</option>
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        Month
        <select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" defaultValue={selected.month} name="month">
          <option value="">Any month</option>
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 md:col-span-5">
        <p>Use query parameters like `?country=NG&crop=maize` to drive SSR-filtered views and API caching.</p>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-white" type="submit">
          Apply filters
        </button>
      </div>
    </form>
  );
}
