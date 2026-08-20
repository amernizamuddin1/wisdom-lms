"use client";

import { useReportWebVitals } from "next/web-vitals";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const reportWebVitals: ReportWebVitalsCallback = (metric) => {
  const isStaging = window.location.hostname.includes(".staging.");
  if (!isStaging && Math.random() > 0.1) return;

  const attribution = "attribution" in metric
    ? (metric.attribution as Record<string, unknown> | undefined)
    : undefined;
  const element = attribution && typeof attribution.element === "string"
    ? attribution.element.slice(0, 300)
    : undefined;
  const url = attribution && typeof attribution.url === "string"
    ? attribution.url.slice(0, 500)
    : undefined;

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: window.location.pathname,
    host: window.location.hostname,
    element,
    url,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/vitals", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/vitals", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
  });
};

export default function WebVitalsReporter() {
  useReportWebVitals(reportWebVitals);
  return null;
}
