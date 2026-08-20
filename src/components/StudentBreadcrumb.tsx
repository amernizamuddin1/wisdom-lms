"use client";

import Breadcrumb from "./Breadcrumb";

const LABEL_MAP: Record<string, string> = {
  dashboard: "My Courses",
  analytics: "Analytics",
  achievements: "Achievements",
  orders: "Order History",
  profile: "Profile",
  certificates: "Certificates",
  courses: "Course",
  discussion: "Discussion Board",
};

export default function StudentBreadcrumb() {
  return <Breadcrumb rootSegment="dashboard" labelMap={LABEL_MAP} />;
}
