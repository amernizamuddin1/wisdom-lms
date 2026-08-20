"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { CourseLevel } from "@/generated/prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CourseDetailsForm = dynamic(() =>
  import("./CourseDetailsForm").then((module) => module.CourseDetailsForm),
);
const CoursePricingForm = dynamic(() =>
  import("./CourseDetailsForm").then((module) => module.CoursePricingForm),
);
const CourseLearningDetailsForm = dynamic(() =>
  import("./CourseLearningDetailsForm").then((module) => module.CourseLearningDetailsForm),
);
const CoursePreviewVideoForm = dynamic(() =>
  import("./CoursePreviewVideoForm").then((module) => module.CoursePreviewVideoForm),
);
const CourseMetaForm = dynamic(() =>
  import("./CourseMetaForm").then((module) => module.CourseMetaForm),
);
const CourseInstructorsForm = dynamic(() =>
  import("./CourseInstructorsForm").then((module) => module.CourseInstructorsForm),
);
const CourseLaunchDateForm = dynamic(() =>
  import("./CourseLaunchDateForm").then((module) => module.CourseLaunchDateForm),
);
const ThumbnailUploader = dynamic(() => import("./ThumbnailUploader"));
const ChaptersSection = dynamic(() => import("./ChaptersSection"));
const CourseQuizzesSection = dynamic(() => import("./CourseQuizzesSection"));

type CurrencyPrice = {
  amount: string;
  discountedPrice: string;
  discountStartAt: string;
  discountEndAt: string;
  maxDiscountedEnrollments: string;
  discountedEnrollmentsUsed: number;
};

type EditorData = {
  courseId: string;
  basic: {
    title: string;
    shortDescription: string;
    description: string;
    isFree: boolean;
    tags: string[];
  };
  media: { thumbnailUrl: string | null; previewVideoUrl: string };
  learning: {
    prerequisites: string[];
    learningObjectives: string[];
    outcomes: string[];
    materialsIncluded: string[];
    targetAudience: string[];
  };
  curriculum: {
    chapters: Array<{
      id: string;
      title: string;
      lessons: Array<{ id: string; title: string }>;
      quizzes: Array<{ id: string; title: string }>;
    }>;
    quizzes: Array<{ id: string; title: string }>;
  };
  instructors: {
    all: Array<{ id: string; name: string; title: string | null; avatarUrl: string | null }>;
    selectedIds: string[];
  };
  pricing: {
    isFree: boolean;
    inr: CurrencyPrice;
    usd: CurrencyPrice;
    eur: CurrencyPrice;
    meta: {
      level: CourseLevel | null;
      durationMinutes: number | null;
      certificateEnabled: boolean;
      isPermanentAccess: boolean;
      accessDurationMonths: number | null;
    };
  };
  publishing: { launchDate: string };
};

const tabClassName = "space-y-6 pt-4";

export default function CourseEditorTabs({ data }: { data: EditorData }) {
  const [activeTab, setActiveTab] = useState("basic");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="basic">Basic Information</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="learning">Learning Details</TabsTrigger>
        <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
        <TabsTrigger value="instructor">Instructor</TabsTrigger>
        <TabsTrigger value="pricing">Pricing &amp; Access</TabsTrigger>
        <TabsTrigger value="publishing">Publishing</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className={tabClassName}>
        {activeTab === "basic" && <CourseDetailsForm courseId={data.courseId} {...data.basic} />}
      </TabsContent>

      <TabsContent value="media" className={tabClassName}>
        {activeTab === "media" && (
          <>
            <ThumbnailUploader courseId={data.courseId} thumbnailUrl={data.media.thumbnailUrl} />
            <CoursePreviewVideoForm courseId={data.courseId} previewVideoUrl={data.media.previewVideoUrl} />
          </>
        )}
      </TabsContent>

      <TabsContent value="learning" className={tabClassName}>
        {activeTab === "learning" && (
          <CourseLearningDetailsForm courseId={data.courseId} {...data.learning} />
        )}
      </TabsContent>

      <TabsContent value="curriculum" className={tabClassName}>
        {activeTab === "curriculum" && (
          <>
            <div>
              <h3 className="mb-3 font-medium text-foreground">Chapters &amp; Lessons</h3>
              <ChaptersSection courseId={data.courseId} initialChapters={data.curriculum.chapters} />
            </div>
            <CourseQuizzesSection courseId={data.courseId} quizzes={data.curriculum.quizzes} />
          </>
        )}
      </TabsContent>

      <TabsContent value="instructor" className={tabClassName}>
        {activeTab === "instructor" && (
          <CourseInstructorsForm
            courseId={data.courseId}
            allInstructors={data.instructors.all}
            selectedIds={data.instructors.selectedIds}
          />
        )}
      </TabsContent>

      <TabsContent value="pricing" className={tabClassName}>
        {activeTab === "pricing" && (
          <>
            {!data.pricing.isFree && (
              <CoursePricingForm
                courseId={data.courseId}
                inr={data.pricing.inr}
                usd={data.pricing.usd}
                eur={data.pricing.eur}
              />
            )}
            <CourseMetaForm courseId={data.courseId} {...data.pricing.meta} />
          </>
        )}
      </TabsContent>

      <TabsContent value="publishing" className={tabClassName}>
        {activeTab === "publishing" && (
          <CourseLaunchDateForm courseId={data.courseId} launchDate={data.publishing.launchDate} />
        )}
      </TabsContent>
    </Tabs>
  );
}
