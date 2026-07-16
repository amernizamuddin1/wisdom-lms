import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopContributorRow } from "@/lib/analytics/community-analytics";

export default function TopContributorsTable({ rows }: { rows: TopContributorRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Contributors</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No community contributions in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Learner</th>
                  <th className="py-2 font-medium">Posts</th>
                  <th className="py-2 font-medium">Replies</th>
                  <th className="py-2 font-medium">Helpful Answers</th>
                  <th className="py-2 font-medium">Community XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.userId}>
                    <td className="py-2">
                      <p className="font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="py-2 text-muted-foreground">{r.posts}</td>
                    <td className="py-2 text-muted-foreground">{r.replies}</td>
                    <td className="py-2 text-muted-foreground">{r.helpfulAnswers}</td>
                    <td className="py-2 font-medium text-foreground">{r.communityXp.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
