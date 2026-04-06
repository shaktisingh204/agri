import Link from "next/link";
import { UploadConsole } from "../../../components/upload-console";
import { getUploads } from "../../../lib/api";

export default async function AdminUploadsPage() {
  const uploads = await getUploads();

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-700">Admin workflows</p>
          <h1 className="mt-2 text-4xl font-semibold text-slate-900">Upload and ingestion operations</h1>
        </div>
        <Link className="rounded-full bg-slate-900 px-5 py-3 text-sm text-white" href="/">
          Back to dashboard
        </Link>
      </div>
      <UploadConsole uploads={uploads} />
    </main>
  );
}

