import Link from "next/link";
import { BarChart3, FileUp, Globe2, Sprout } from "lucide-react";

const items = [
  { href: "/", label: "Calendar Explorer", icon: Sprout, type: "route" as const },
  { href: "/admin/uploads", label: "Admin Uploads", icon: FileUp, type: "route" as const },
  { href: "#coverage", label: "Agro Zones", icon: Globe2, type: "anchor" as const },
  { href: "#analytics", label: "Usage Analytics", icon: BarChart3, type: "anchor" as const }
];

export function Sidebar() {
  return (
    <aside className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-soft backdrop-blur">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-emerald-700">AgriSphere</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Crop Calendar SaaS</h1>
        <p className="mt-2 text-sm text-slate-600">
          Explore planting, growth, and harvesting patterns across countries and agro-ecological zones.
        </p>
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const className =
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900";

          if (item.type === "anchor") {
            return (
              <a key={item.label} className={className} href={item.href}>
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          }

          return (
            <Link key={item.label} className={className} href={item.href}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 rounded-2xl bg-slate-900 p-4 text-sm text-slate-200">
        <p className="font-medium text-white">Enterprise-ready</p>
        <p className="mt-2 text-slate-300">
          Multi-tenant access, usage monitoring, PDF ingestion, and billing hooks are scaffolded for scale.
        </p>
      </div>
    </aside>
  );
}
