interface MetricsGridProps {
  calendarCount: number;
  countryCount: number;
  regionCount: number;
  totalRequests: number;
}

export function MetricsGrid({ calendarCount, countryCount, regionCount, totalRequests }: MetricsGridProps) {
  const cards = [
    { label: "Calendar Records", value: calendarCount, note: "Multi-season crop windows" },
    { label: "Countries Covered", value: countryCount, note: "Tenant filter aware geography" },
    { label: "Agro Zones", value: regionCount, note: "Region-level lifecycle variants" },
    { label: "Tracked Requests", value: totalRequests, note: "Usage analytics and demand signals" }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{card.label}</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{card.value}</p>
          <p className="mt-2 text-sm text-slate-600">{card.note}</p>
        </div>
      ))}
    </div>
  );
}

