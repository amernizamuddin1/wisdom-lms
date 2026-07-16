import type { FailedPaymentRow } from "@/lib/analytics/commerce-payments";

export default function FailedPaymentsTable({ rows }: { rows: FailedPaymentRow[] }) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="font-semibold text-foreground">Failed Payments</h3>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Order #</th>
              <th className="px-4 py-3 font-medium">Learner</th>
              <th className="px-4 py-3 font-medium">Gateway</th>
              <th className="px-4 py-3 font-medium">Gateway Order ID</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.orderPaymentId} className="hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{r.orderNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.userName}
                  <br />
                  <span className="text-xs">{r.userEmail}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.gateway ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.gatewayOrderId ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No failed payments in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
