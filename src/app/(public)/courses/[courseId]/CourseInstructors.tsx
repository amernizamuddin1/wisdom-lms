import Image from "next/image";
import { UserIcon } from "lucide-react";

type InstructorRow = { id: string; name: string; title: string | null; bio: string | null; avatarUrl: string | null };

export default function CourseInstructors({ instructors }: { instructors: InstructorRow[] }) {
  if (instructors.length === 0) return null;

  return (
    <div className="space-y-3 border-t pt-4">
      <h2 className="text-sm font-semibold text-foreground">
        Instructor{instructors.length > 1 ? "s" : ""}
      </h2>
      <div className="space-y-3">
        {instructors.map((instructor) => (
          <div key={instructor.id} className="flex gap-3">
            <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {instructor.avatarUrl ? (
                <Image
                  src={instructor.avatarUrl}
                  alt={instructor.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <UserIcon className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{instructor.name}</p>
              {instructor.title && (
                <p className="text-xs text-muted-foreground">{instructor.title}</p>
              )}
              {instructor.bio && (
                <p className="mt-1 font-body text-xs text-muted-foreground">{instructor.bio}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
