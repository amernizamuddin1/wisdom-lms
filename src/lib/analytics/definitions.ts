// Canonical metric definitions for Admin Analytics (Phase 1). Every query
// module in this directory implements exactly what's documented here — if a
// number looks wrong, check here first before re-deriving logic ad hoc.
//
// Active learner        — has ≥1 UserDailyLearningActivity row with
//                          isQualifyingDay = true in the selected range
//                          (platform-wide views), or ≥1 lesson/quiz/learning-
//                          time signal for the specific course in range
//                          (course-scoped views — see courses.ts).
// Enrollment             — an Enrollment row (status ACTIVE), counted by
//                          enrolledAt falling in range.
// Started course         — enrolled AND (has learning time > 0 for the
//                          course OR ≥1 completed lesson in it).
// Course completion      — a UserActivityEvent of type COURSE_COMPLETED
//                          (the app's real completion trigger — see
//                          lib/gamification/completion.ts), not a
//                          recomputed 100%-progress check.
// Completion rate        — completions ÷ enrollments in scope.
// Average progress       — (Σ completed lessons + Σ passed quizzes) ÷
//                          (lessons+quizzes × enrollments) for a course.
// Learning time          — Σ UserDailyLearningActivity.learningTimeSeconds
//                          in range (platform-wide). Per-course figures use
//                          UserCourseLearningTime, which is a cumulative
//                          all-time total, not range-bound — always labeled
//                          "All-time" wherever shown.
// Average quiz score     — mean of each learner's *best* score per quiz
//                          (same convention as the student-facing analytics
//                          page), aggregated across attempts in scope.
// Drop-off rate (lesson) — among learners who completed lesson N, the % who
//                          never completed lesson N+1 in the same course.
// Revenue                — Σ Order.totalAmount where status = PAID, by
//                          paidAt in range. Course-scoped revenue counts
//                          only direct course purchases (OrderItem with a
//                          matching courseId), not bundle revenue attributed
//                          to a course inside it.
// Returning learner      — active (qualifying day) in the selected range AND
//                          also had a qualifying day before the range
//                          started (not a first-time-active learner).
// At-risk learner        — enrolled in ≥1 incomplete course AND no
//                          qualifying activity in the last atRiskDays
//                          (configurable, default 14 — see settings.ts).
// Dormant learner        — no qualifying activity in the last dormantDays
//                          (configurable, default 30) AND joined more than
//                          dormantDays ago.

export const QUIZ_DIFFICULTY_THRESHOLDS = {
  EASY_MIN_CORRECT_PERCENT: 80,
  MODERATE_MIN_CORRECT_PERCENT: 60,
  HARD_MIN_CORRECT_PERCENT: 40,
} as const;

export type QuizDifficulty = "Easy" | "Moderate" | "Hard" | "Very Hard";

export function classifyQuestionDifficulty(correctPercent: number): QuizDifficulty {
  if (correctPercent >= QUIZ_DIFFICULTY_THRESHOLDS.EASY_MIN_CORRECT_PERCENT) return "Easy";
  if (correctPercent >= QUIZ_DIFFICULTY_THRESHOLDS.MODERATE_MIN_CORRECT_PERCENT) return "Moderate";
  if (correctPercent >= QUIZ_DIFFICULTY_THRESHOLDS.HARD_MIN_CORRECT_PERCENT) return "Hard";
  return "Very Hard";
}

// Engagement-segment constants that are NOT admin-configurable — only the
// day-count windows in Settings are, per the product spec's explicit ask.
export const SLOWING_DOWN_DROP_RATIO = 0.4; // ≥40% fewer qualifying days than the prior window
export const HIGHLY_ENGAGED_MIN_STREAK_DAYS = 7;
export const HIGHLY_ENGAGED_MIN_QUALIFYING_DAYS_30 = 20;

// Lesson drop-off is "unusually high" (visually flagged) at or above this rate.
export const HIGH_DROPOFF_THRESHOLD_PERCENT = 25;

export const FUNNEL_STAGES = ["ENROLLED", "STARTED", "REACHED_25", "REACHED_50", "REACHED_75", "COMPLETED"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  ENROLLED: "Enrolled",
  STARTED: "Started",
  REACHED_25: "Reached 25%",
  REACHED_50: "Reached 50%",
  REACHED_75: "Reached 75%",
  COMPLETED: "Completed",
};

// ── Phase 2: Engagement Intelligence ────────────────────────────────────
//
// Meaningful activity day  — a UserDailyLearningActivity row with
//                             isQualifyingDay = true (unchanged Phase 1
//                             definition: >=1 lesson completed, >=1 quiz
//                             completed, or learning time past the
//                             streak-qualifying threshold), OR a
//                             DISCUSSION_POST_CREATED / DISCUSSION_REPLY_CREATED
//                             UserActivityEvent on that user-local day. This
//                             extends the existing "qualifying day" concept
//                             with exactly one new signal (community
//                             participation) rather than defining a second,
//                             parallel notion of "activity."
// DAU                      — count of distinct students with a meaningful
//                             activity day on a given calendar day (learner-
//                             local time).
// WAU                      — count of distinct students with >=1 meaningful
//                             activity day in the trailing 7 days (inclusive
//                             of the day itself).
// MAU                      — same, trailing 30 days.
// Stickiness               — DAU / MAU for a given day (a ratio, not a %).
// Returning learner (Phase 2 trend) — active in the selected period AND had
//                             a meaningful activity day before the period
//                             started.
// New learner               — first-ever meaningful activity day falls
//                             inside the selected period.
// Resurrected learner       — active in the selected period, previously
//                             active before that, but with a gap of at least
//                             RESURRECTION_THRESHOLD_DAYS with zero
//                             meaningful activity immediately before this
//                             period's activity.
// Retained learner (cohort) — had >=1 meaningful activity day during the
//                             cohort-relative period being measured (Week N
//                             / Month N since the learner's first
//                             enrollment — see RETENTION_COHORT_BASIS).
// Community participant     — a student with >=1 meaningful community
//                             action (a qualifying post or reply, i.e. one
//                             that earned XP) in the selected period.
// Community participation rate — community participants ÷ students with
//                             >=1 active enrollment, in the selected period.
// Active streak              — UserGamificationProfile.currentStreak >= 1.
// Segment recovery            — a learner whose UserSegmentSnapshot moves
//                             from AT_RISK or DORMANT to ACTIVE or
//                             HIGHLY_ENGAGED between two snapshot dates.
// Engagement segment transition — any change in a learner's snapshot
//                             segment between two snapshot dates.

// Admin timezone fallback used only where a per-user conversion genuinely
// isn't available (there is always a User.timezone, defaulted at signup, so
// this is a defensive fallback, not the common path).
export const FALLBACK_TIMEZONE = "Asia/Kolkata";

// A learner is "resurrected" when they return after this many days with
// zero meaningful activity. Not admin-configurable (unlike the segment
// windows in Settings) — a fixed, documented product default.
export const RESURRECTION_THRESHOLD_DAYS = 30;

// Below this many learners in either side of an observational comparison
// (gamification or community engagement vs. a control group), the
// comparison is suppressed rather than shown with a misleadingly precise
// percentage.
export const MIN_COMPARISON_SAMPLE_SIZE = 20;

// The UserActivityEvent types that count as "community activity" for
// meaningful-activity/DAU purposes and for the community participation
// rate. Reactions/accepted-answer events are XP-only side effects of
// someone else's action, not the acting learner's own engagement, so they
// are intentionally excluded here.
export const COMMUNITY_MEANINGFUL_EVENT_TYPES = ["DISCUSSION_POST_CREATED", "DISCUSSION_REPLY_CREATED"] as const;

// Retention cohorts group learners by the calendar week/month of their
// first-ever enrollment (course-scoped views use the first enrollment in
// that specific course). This is the spec's recommended default — surfaced
// explicitly in the retention page UI rather than left implicit.
export const RETENTION_COHORT_BASIS = "first_enrollment" as const;

// Deterministic XP category taxonomy — kept in this server-only-free module
// (rather than gamification-analytics.ts, which imports "server-only" +
// prisma) so client components like XpTrendChart can import just the
// category list without pulling a server-only module into the client bundle.
export const XP_CATEGORIES = ["Learning Progress", "Quizzes", "Community", "Achievements", "Other"] as const;

// ── Phase 3: Commercial Intelligence ────────────────────────────────────
//
// No profitability/margin data exists anywhere in this schema — no cost-of-
// goods, payment-gateway-fee, or instructor-payout figures are tracked.
// Every "revenue" figure below is gross or net-of-discounts-and-refunds
// only, never margin/profit. Do not present any Phase 3 number as profit.
//
// Gross revenue          — Σ Order.totalAmount where status = PAID, by
//                          paidAt in range (same convention as Phase 1's
//                          Revenue definition above).
// Net revenue            — Gross revenue minus Σ Refund.amount where
//                          Refund.refundedAt falls in the same range.
// Transactions            — count of Order rows with status = PAID, by
//                          paidAt in range (one row per completed checkout,
//                          regardless of how many items it contains).
// Paying learners         — distinct User ids with >=1 PAID order in range.
// Average order value (AOV) — gross revenue ÷ transactions in range.
// Revenue per learner     — gross revenue ÷ paying learners in range.
// Refund amount           — Σ Refund.amount by refundedAt in range.
// Discount value given    — Σ (OrderItem.originalPrice - OrderItem.finalPrice)
//                          across PAID orders' items in range, plus Σ
//                          Order.couponDiscountAmount for orders with a
//                          coupon applied in range. These are two distinct
//                          discount mechanisms (sale pricing vs. coupon
//                          codes — see Coupon model comment) and are always
//                          reported as a sum, never conflated into one
//                          "type" of discount.
// Payment success rate    — OrderPayment rows with status = COMPLETED,
//                          divided by all OrderPayment rows created in
//                          range (COMPLETED + FAILED + PENDING).
// Cart-checkout revenue   — every Phase 3 revenue figure is scoped to the
//                          Order/OrderItem cart-checkout flow only. The
//                          legacy single-course Payment model (pre-dating
//                          the cart) is excluded throughout — its rows have
//                          no corresponding Order/OrderItem/CommerceEvent
//                          data, so Phase 3 numbers are not total historical
//                          platform revenue.
//
// Product performance duplicate-counting rule — a course sold standalone
// (OrderItem.itemType = COURSE) and the same course sold inside a bundle
// (OrderItem.itemType = BUNDLE) are counted separately everywhere in Phase
// 3. Bundle revenue is never decomposed and attributed back to its member
// courses (matches Phase 1's existing Revenue definition, which already
// makes this same call for course-scoped revenue).
//
// Commercial funnel stages — PRODUCT_VIEWED -> ADDED_TO_CART ->
// CHECKOUT_STARTED -> PAYMENT_INITIATED -> PAID (the last stage read
// directly from Order.status, not a CommerceEvent). This is a distinct
// concept from the existing learning-progress funnel in funnel.ts
// (ENROLLED -> STARTED -> REACHED_25/50/75 -> COMPLETED) — never conflate
// the two. CommerceEvent rows only exist from this feature's ship date
// forward, so any date range before that shows zero/near-zero counts for
// the first four stages while PAID has full history — always caption this
// asymmetry next to the funnel chart. PRODUCT_VIEWED additionally only
// fires for authenticated visitors (no anonymous/session id exists
// anywhere in the app to key an anonymous event on) — label any
// conversion-from-view metric "authenticated-visitor conversion", not
// site-wide conversion.
//
// Repeat buyer            — a learner with >=2 distinct PAID orders,
//                          all-time (not range-scoped, since "repeat" is a
//                          lifetime learner attribute).
// Free-to-paid conversion — a learner with >=1 enrollment where
//                          source = FREE_CHECKOUT (or course/bundle
//                          isFree = true) who later placed >=1 PAID order.
// Bundle utilization      — for a BundleEnrollment holder, the fraction of
//                          that bundle's member courses (BundleCourse) they
//                          have >=1 meaningful activity signal in (started,
//                          per getCourseItemIds-based signals), averaged
//                          across all holders of that bundle.
// Days to refund           — Refund.refundedAt minus the parent Order's
//                          paidAt (Order.paidAt is immutable once PAID, so
//                          this is computed at query time, never stored).

export const MIN_PAYMENT_SAMPLE_SIZE = 10;
export const REVENUE_DECLINE_ALERT_PERCENT = -15;
export const PAYMENT_FAILURE_RATE_INCREASE_ALERT_POINTS = 10;
export const HIGH_REFUND_RATE_ALERT_PERCENT = 10;
export const MIN_REFUND_SAMPLE_ORDERS = 10;
export const LOW_BUNDLE_UTILIZATION_ALERT_PERCENT = 30;

export const COMMERCIAL_FUNNEL_STAGES = [
  "PRODUCT_VIEWED",
  "ADDED_TO_CART",
  "CHECKOUT_STARTED",
  "PAYMENT_INITIATED",
  "PAID",
] as const;
export type CommercialFunnelStage = (typeof COMMERCIAL_FUNNEL_STAGES)[number];

export const COMMERCIAL_FUNNEL_STAGE_LABELS: Record<CommercialFunnelStage, string> = {
  PRODUCT_VIEWED: "Product Viewed",
  ADDED_TO_CART: "Added to Cart",
  CHECKOUT_STARTED: "Checkout Started",
  PAYMENT_INITIATED: "Payment Initiated",
  PAID: "Payment Completed",
};

export const REVENUE_ENGAGEMENT_QUADRANTS = [
  "HIGH_REVENUE_HIGH_ENGAGEMENT",
  "HIGH_REVENUE_LOW_ENGAGEMENT",
  "LOW_REVENUE_HIGH_ENGAGEMENT",
  "LOW_REVENUE_LOW_ENGAGEMENT",
] as const;
export type RevenueEngagementQuadrant = (typeof REVENUE_ENGAGEMENT_QUADRANTS)[number];

export const REVENUE_ENGAGEMENT_QUADRANT_LABELS: Record<RevenueEngagementQuadrant, string> = {
  HIGH_REVENUE_HIGH_ENGAGEMENT: "High Revenue, High Engagement",
  HIGH_REVENUE_LOW_ENGAGEMENT: "High Revenue, Low Engagement",
  LOW_REVENUE_HIGH_ENGAGEMENT: "Low Revenue, High Engagement",
  LOW_REVENUE_LOW_ENGAGEMENT: "Low Revenue, Low Engagement",
};

export const COMMERCE_METRIC_TOOLTIPS = {
  grossRevenue: "Sum of paid orders (status: Paid) by payment date within the selected date range.",
  netRevenue: "Gross revenue minus refunds issued within the selected date range.",
  transactions: "Count of paid orders by payment date within the selected date range.",
  payingLearners: "Distinct learners with at least one paid order in the selected date range.",
  averageOrderValue: "Gross revenue divided by the number of paid orders in the selected date range.",
  revenuePerLearner: "Gross revenue divided by the number of paying learners in the selected date range.",
  refundAmount: "Sum of refunds issued within the selected date range.",
  discountValueGiven: "Sum of per-item sale-price discounts plus coupon discounts applied to paid orders in the selected date range.",
  paymentSuccessRate: "Completed payment attempts as a share of all payment attempts (completed, failed, or pending) in the selected date range.",
  commercialFunnel: "Distinct learners at each commercial funnel stage. Product Viewed / Added to Cart / Checkout Started / Payment Initiated only count authenticated visitors and only exist from this feature's launch date forward.",
  productConversionRate: "Paid orders for this course/bundle divided by authenticated product views in the selected date range.",
  averageSellingPrice: "Total revenue for this course/bundle divided by units sold in the selected date range.",
  bundleUtilization: "Average share of a bundle's included courses that holders have started, across all current bundle holders.",
  repeatPurchaseRate: "Learners with two or more paid orders (all-time) as a share of all paying learners.",
  freeToPaidConversionRate: "Learners with a free enrollment who later placed at least one paid order, as a share of all free-enrolled learners.",
  daysToRefund: "Days between an order's payment date and the date it was refunded.",
  revenueEngagementQuadrant: "Courses classified by revenue (above/below the platform median) and completion rate (above/below the platform median) into four groups.",
} as const;

export const METRIC_TOOLTIPS = {
  totalLearners: "Every user with the Student role, regardless of enrollment or activity.",
  activeLearners:
    "Learners with at least one qualifying activity day (a completed lesson, a completed quiz, or meaningful learning time) in the selected date range.",
  totalEnrollments: "Active course enrollments created within the selected date range.",
  courseCompletions: "Courses marked complete within the selected date range.",
  completionRate: "Course completions divided by enrollments in the selected date range.",
  totalLearningTime: "Total learning time logged by all learners in the selected date range.",
  averageQuizScore:
    "Average of each learner's best score per quiz, across quiz attempts made in the selected date range.",
  revenue: "Sum of paid orders (status: Paid) by payment date within the selected date range.",
  enrollmentFunnel: "Learners at each stage of course progress, as a share of everyone ever enrolled in scope.",
  courseAvgProgress: "Average of (completed lessons + passed quizzes) across every learner enrolled in the course.",
  courseLearningTime: "All-time cumulative learning time logged in this course (not limited to the selected range).",
  lessonDropoff: "Share of learners who completed this lesson but never completed the next one in the course.",
  quizPassRate: "Attempts that met the quiz's pass percentage, as a share of all attempts.",
  quizAvgAttemptsToPass: "Average number of attempts a learner needed before first passing this quiz.",
  questionDifficulty: "Correct-answer rate across every recorded attempt at this question.",
  atRiskLearner: "Enrolled in an incomplete course with no qualifying activity in the configured at-risk window.",
  dormantLearner: "No qualifying activity in the configured dormant window, and joined before that window began.",

  dau: "Unique learners with a meaningful activity day (lesson/quiz progress, learning time, or a qualifying community post/reply) today.",
  wau: "Unique learners with a meaningful activity day at least once in the trailing 7 days.",
  mau: "Unique learners with a meaningful activity day at least once in the trailing 30 days.",
  stickiness: "DAU divided by MAU — the share of monthly active learners who are also active today.",
  avgActiveDaysPerLearner: "Average number of distinct meaningful-activity days per learner in the selected range.",
  avgLearningMinutesPerActiveLearner: "Total learning minutes in the selected range divided by the number of active learners.",
  returningLearnerRate: "Active learners in the selected range who were also active before it began, as a share of all active learners.",
  atRiskLearnersKpi: "Learners enrolled in an incomplete course with no meaningful activity in the configured at-risk window, as of the end of the selected range.",
  newLearner: "A learner whose first-ever meaningful activity day falls inside the selected range.",
  returningLearner: "A learner active in the selected range who was also active before the range began.",
  resurrectedLearner: "A learner active in the selected range after a gap of 30+ days with no meaningful activity.",
  retainedLearner: "A learner with at least one meaningful activity day during the cohort-relative period shown (Week N / Month N since their first enrollment).",
  communityParticipant: "A learner with at least one qualifying community post or reply (one that earned XP) in the selected range.",
  activeStreak: "A learner whose current streak (Gamification profile) is 1 day or longer.",
  segmentTransition: "A change in a learner's daily engagement-segment snapshot between two dates — e.g. moving from Active to At Risk.",
  engagementSegmentHighlyEngaged: "Active within the configured active window and either on a 7+ day streak or with 20+ qualifying days in the last 30.",
  engagementSegmentActive: "Had meaningful activity within the configured active window, but doesn't meet the Highly Engaged bar.",
  engagementSegmentSlowingDown: "Previously active, but meaningful activity in the recent window dropped by 40%+ versus the prior comparable window, and the learner still has an incomplete course.",
  engagementSegmentAtRisk: "Enrolled in an incomplete course with no meaningful activity in the configured at-risk window.",
  engagementSegmentDormant: "No meaningful activity in the configured dormant window, and the account is older than that window.",
} as const;
