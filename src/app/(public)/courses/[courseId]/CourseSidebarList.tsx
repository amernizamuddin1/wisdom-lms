export default function CourseSidebarList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 border-t pt-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="list-inside list-disc space-y-1 font-body text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
