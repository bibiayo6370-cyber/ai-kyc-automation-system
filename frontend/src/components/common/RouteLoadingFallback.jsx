import { LoaderCircle, ShieldCheck } from "lucide-react";

export default function RouteLoadingFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-slate-100" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><ShieldCheck className="size-7" /></div>
        <LoaderCircle className="mt-5 size-6 animate-spin text-emerald-400" />
        <p className="mt-3 text-sm text-slate-400">Loading secure KYC workspace...</p>
      </div>
    </main>
  );
}