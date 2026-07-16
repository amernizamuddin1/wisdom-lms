import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CertificatesPage() {
  const user = await requireUser();

  const certificates = await prisma.certificate.findMany({
    where: { userId: user.id },
    include: { course: true },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Certificates</h2>

      {certificates.length === 0 ? (
        <p className="text-muted-foreground">
          No certificates yet — complete a course to earn one.
        </p>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div>
                <p className="font-medium text-foreground">{cert.course.title}</p>
                <p className="text-sm text-muted-foreground">
                  Issued {cert.issuedAt.toLocaleDateString()}
                </p>
              </div>
              <a
                href={cert.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
