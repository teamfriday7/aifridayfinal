export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="soft-card rounded-[22px] p-4">
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{value}</p>
      <p className="mt-1 text-sm text-[color:var(--muted)]">{detail}</p>
    </div>
  );
}
