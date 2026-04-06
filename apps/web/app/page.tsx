import { AnalyticsChart } from "../components/analytics-chart";
import { CalendarTimeline } from "../components/calendar-timeline";
import { ComparisonPanel } from "../components/comparison-panel";
import { FiltersPanel } from "../components/filters-panel";
import { MapPanel } from "../components/map-panel";
import { MetricsGrid } from "../components/metrics-grid";
import { Sidebar } from "../components/sidebar";
import { getDashboardData } from "../lib/api";

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const { countries, regions, crops, calendars, hasActiveFilters, usage, popularCrops } = await getDashboardData(
    resolvedSearchParams
  );

  return (
    <main className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[320px_1fr]">
      <Sidebar />
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/60 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 text-white shadow-soft">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Agri intelligence</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight">
            Explore country and agro-zone crop calendars with ingestion, analytics, and multi-tenant controls built in.
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Production-ready workspace for sowing, growing, and harvesting analysis, with PDF upload workflows and API-first distribution.
          </p>
        </section>

        <MetricsGrid
          calendarCount={calendars.length}
          countryCount={countries.length}
          regionCount={regions.length}
          totalRequests={usage.totalRequests}
        />

        <FiltersPanel
          countries={countries}
          regions={regions}
          crops={crops}
          selected={{
            country: typeof resolvedSearchParams.country === "string" ? resolvedSearchParams.country : "",
            state: typeof resolvedSearchParams.state === "string" ? resolvedSearchParams.state : "",
            region: typeof resolvedSearchParams.region === "string" ? resolvedSearchParams.region : "",
            crop: typeof resolvedSearchParams.crop === "string" ? resolvedSearchParams.crop : "",
            season: typeof resolvedSearchParams.season === "string" ? resolvedSearchParams.season : "",
            month: typeof resolvedSearchParams.month === "string" ? resolvedSearchParams.month : ""
          }}
        />

        <CalendarTimeline calendars={calendars} hasActiveFilters={hasActiveFilters} />
        {hasActiveFilters ? (
          <ComparisonPanel calendars={calendars} />
        ) : (
          <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Comparison mode</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Filter to compare crops</h2>
            <p className="mt-3 text-sm text-slate-600">
              Crop comparison is available after running a filtered search.
            </p>
          </section>
        )}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <MapPanel regions={regions} />
          <AnalyticsChart data={popularCrops} />
        </div>
      </div>
    </main>
  );
}
