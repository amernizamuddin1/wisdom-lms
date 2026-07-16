"use client";

import Link from "next/link";
import { useActionState } from "react";
import { selfEnrollFree, type EnrollFreeState } from "./actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SignupEnrollForm from "./SignupEnrollForm";
import AddToCartButtons from "./AddToCartButtons";

const initialState: EnrollFreeState = {};

function LoggedInFreeEnrollForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(selfEnrollFree, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="courseId" value={courseId} />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enrolling..." : "Enroll Now — Free"}
      </Button>
    </form>
  );
}

export default function EnrollSection({
  courseId,
  isFree,
  isLoggedIn,
  isEnrolled,
  razorpayConfigured,
}: {
  courseId: string;
  isFree: boolean;
  isLoggedIn: boolean;
  isEnrolled: boolean;
  razorpayConfigured: boolean;
}) {
  if (isEnrolled) {
    return (
      <Button asChild className="w-full">
        <Link href={`/dashboard/courses/${courseId}`}>Go to Course</Link>
      </Button>
    );
  }

  if (isFree) {
    return isLoggedIn ? (
      <LoggedInFreeEnrollForm courseId={courseId} />
    ) : (
      <SignupEnrollForm courseId={courseId} />
    );
  }

  if (razorpayConfigured) {
    return (
      <AddToCartButtons
        target={{ itemType: "COURSE", courseId }}
        isLoggedIn={isLoggedIn}
        loginReturnPath={`/courses/${courseId}`}
      />
    );
  }

  return (
    <div className="space-y-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" className="w-full" disabled>
            Enroll — Checkout Coming Soon
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Online payment isn&apos;t available yet. If you were enrolled by an admin, log in to
          access this course.
        </TooltipContent>
      </Tooltip>
      <Button asChild variant="outline" className="w-full">
        <Link href="/login">Log In</Link>
      </Button>
    </div>
  );
}
