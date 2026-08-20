"use client";

import Breadcrumb from "./Breadcrumb";

const LABEL_MAP: Record<string, string> = {
  admin: "Dashboard",
  analytics: "Analytics",
  courses: "Courses",
  lessons: "Lessons",
  bundles: "Course Bundles",
  instructors: "Instructors",
  groups: "Institutions",
  admins: "Sub-admins",
  "bulk-import": "Bulk Import",
  orders: "Orders",
  coupons: "Coupons",
  enrollments: "Enrollments",
  reports: "Reports",
  communications: "Communications",
  emails: "Emails",
  community: "Community",
  discussions: "Discussions",
  categories: "Discussion Categories",
  "restricted-users": "Restricted Users",
  "moderation-log": "Moderation Log",
  settings: "Settings",
  users: "Users",
  subscribers: "Subscribers",
  new: "New",
};

export default function AdminBreadcrumb() {
  return <Breadcrumb rootSegment="admin" labelMap={LABEL_MAP} />;
}
