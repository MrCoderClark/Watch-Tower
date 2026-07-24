import { WatchtowerWordmark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10">
        <WatchtowerWordmark />
      </div>
      <div className="w-full max-w-sm rounded-xl border border-wt-border bg-wt-bg-2 p-8 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.6)]">
        {children}
      </div>
      <p className="mt-6 text-xs text-wt-text-dim">
        Application observability, without the yak-shaving.
      </p>
    </div>
  );
}
