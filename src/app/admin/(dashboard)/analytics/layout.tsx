import AnalyticsSubNav from "./AnalyticsSubNav";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <AnalyticsSubNav />
      {children}
    </div>
  );
}
