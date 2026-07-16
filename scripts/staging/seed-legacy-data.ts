// Seeds a representative slice of PRE-TENANCY data (no tenant_id concept)
// directly via raw SQL, matching the exact column set that exists right
// after the 27 pre-tenant migrations and before
// 20260716050000_add_tenants_and_memberships onward. Raw SQL is required
// here (not the generated Prisma Client) because the generated client is
// built from the CURRENT schema, which already expects tenant_id columns
// that don't exist in the DB yet at this point in the validation sequence.
//
// Run with the 5 tenant migrations moved OUT of prisma/migrations, after
// applying the other 27 via `prisma migrate deploy`. See docs/multi-tenancy.md
// "Staging validation" section for the full sequence.
import "./env";
import { Client } from "pg";
import { randomUUID } from "crypto";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const ids = {
    adminUser: randomUUID(),
    student1: randomUUID(),
    student2: randomUUID(),
    instructor: randomUUID(),
    course1: randomUUID(),
    course2: randomUUID(),
    chapter1: randomUUID(),
    lesson1: randomUUID(),
    lesson2: randomUUID(),
    quiz1: randomUUID(),
    question1: randomUUID(),
    question2: randomUUID(),
    attempt1: randomUUID(),
    answer1: randomUUID(),
    bundle1: randomUUID(),
    enrollment1: randomUUID(),
    enrollment2: randomUUID(),
    grant1: randomUUID(),
    certificate1: randomUUID(),
    payment1: randomUUID(),
    cart1: randomUUID(),
    cartItem1: randomUUID(),
    order1: randomUUID(),
    orderItem1: randomUUID(),
    orderPayment1: randomUUID(),
    coupon1: randomUUID(),
    couponRedemption1: randomUUID(),
    importJob1: randomUUID(),
    notification1: randomUUID(),
    notificationRecipient1: randomUUID(),
    campaign1: randomUUID(),
    campaignRecipient1: randomUUID(),
    commerceEvent1: randomUUID(),
    auditLog1: randomUUID(),
    activityEvent1: randomUUID(),
    xpTransaction1: randomUUID(),
    dailyActivity1: randomUUID(),
    courseLearningTime1: randomUUID(),
    segmentSnapshot1: randomUUID(),
    category1: randomUUID(),
    thread1: randomUUID(),
    answerPost1: randomUUID(),
    reply1: randomUUID(),
    reaction1: randomUUID(),
    follow1: randomUUID(),
  };

  const counts: Record<string, number> = {};
  const track = (table: string) => {
    counts[table] = (counts[table] ?? 0) + 1;
  };

  await client.query("BEGIN");
  try {
    // ── Users (pre-migration shape: no is_super_admin column yet) ───────
    await client.query(
      `INSERT INTO "users" (id, name, email, phone, role, timezone, created_at)
       VALUES ($1,'Legacy Admin','legacy-admin@example.test','+911234500001','ADMIN','Asia/Kolkata',now())`,
      [ids.adminUser],
    );
    track("users");
    await client.query(
      `INSERT INTO "users" (id, name, email, phone, role, timezone, created_at)
       VALUES ($1,'Legacy Student One','legacy-student1@example.test','+911234500002','STUDENT','Asia/Kolkata',now())`,
      [ids.student1],
    );
    track("users");
    await client.query(
      `INSERT INTO "users" (id, name, email, phone, role, timezone, created_at)
       VALUES ($1,'Legacy Student Two','legacy-student2@example.test','+911234500003','STUDENT','Asia/Kolkata',now())`,
      [ids.student2],
    );
    track("users");

    // ── Settings / CommunitySettings (old singleton shape, id='main') ───
    await client.query(
      `INSERT INTO "settings" (id, updated_at) VALUES ('main', now())`,
    );
    track("settings");
    // community_settings' single row already exists — seeded by migration
    // 20260715093500_seed_community_defaults. Nothing to insert here.

    // ── Instructor / Course / Chapter / Lesson ──────────────────────────
    await client.query(
      `INSERT INTO "instructors" (id, name, title, created_at, updated_at)
       VALUES ($1,'Legacy Instructor','Senior Faculty',now(),now())`,
      [ids.instructor],
    );
    track("instructors");

    for (const [id, title] of [
      [ids.course1, "Legacy Course One"],
      [ids.course2, "Legacy Course Two"],
    ] as const) {
      await client.query(
        `INSERT INTO "courses" (id, title, is_free, status, learning_status, created_by, created_at, updated_at, is_permanent_access, certificate_enabled)
         VALUES ($1,$2,false,'PUBLISHED','ACTIVE',$3,now(),now(),true,true)`,
        [id, title, ids.adminUser],
      );
      track("courses");
    }
    await client.query(
      `INSERT INTO "course_prices" (id, course_id, currency, amount) VALUES ($1,$2,'INR',1999.00)`,
      [randomUUID(), ids.course1],
    );
    track("course_prices");

    await client.query(
      `INSERT INTO "chapters" (id, course_id, title, "order") VALUES ($1,$2,'Chapter 1',1)`,
      [ids.chapter1, ids.course1],
    );
    track("chapters");
    await client.query(
      `INSERT INTO "lessons" (id, chapter_id, title, lesson_type, "order") VALUES ($1,$2,'Lesson 1','VIDEO',1)`,
      [ids.lesson1, ids.chapter1],
    );
    track("lessons");
    await client.query(
      `INSERT INTO "lessons" (id, chapter_id, title, lesson_type, "order") VALUES ($1,$2,'Lesson 2','TEXT',2)`,
      [ids.lesson2, ids.chapter1],
    );
    track("lessons");

    // ── Quiz + question + attempt + answer ──────────────────────────────
    await client.query(
      `INSERT INTO "quizzes" (id, chapter_id, title, pass_percentage) VALUES ($1,$2,'Chapter 1 Quiz',70)`,
      [ids.quiz1, ids.chapter1],
    );
    track("quizzes");
    await client.query(
      `INSERT INTO "quiz_questions" (id, quiz_id, question_text, question_type, options_json, correct_options_json, "order")
       VALUES ($1,$2,'2+2=?','SINGLE_CHOICE','["3","4","5"]','["4"]',1)`,
      [ids.question1, ids.quiz1],
    );
    track("quiz_questions");
    await client.query(
      `INSERT INTO "quiz_questions" (id, quiz_id, question_text, question_type, options_json, correct_options_json, "order")
       VALUES ($1,$2,'Sky is blue?','TRUE_FALSE','["true","false"]','["true"]',2)`,
      [ids.question2, ids.quiz1],
    );
    track("quiz_questions");
    await client.query(
      `INSERT INTO "quiz_attempts" (id, user_id, quiz_id, score, passed, attempted_at) VALUES ($1,$2,$3,90,true,now())`,
      [ids.attempt1, ids.student1, ids.quiz1],
    );
    track("quiz_attempts");
    await client.query(
      `INSERT INTO "quiz_attempt_answers" (id, attempt_id, question_id, given_options_json, is_correct)
       VALUES ($1,$2,$3,'["4"]',true)`,
      [ids.answer1, ids.attempt1, ids.question1],
    );
    track("quiz_attempt_answers");

    // ── Bundle ────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO "course_bundles" (id, name, slug, status, is_free, created_by, created_at, updated_at, is_permanent_access)
       VALUES ($1,'Legacy Bundle','legacy-bundle','ACTIVE',false,$2,now(),now(),true)`,
      [ids.bundle1, ids.adminUser],
    );
    track("course_bundles");
    await client.query(
      `INSERT INTO "bundle_courses" (id, bundle_id, course_id, "order", added_at) VALUES ($1,$2,$3,0,now())`,
      [randomUUID(), ids.bundle1, ids.course2],
    );
    track("bundle_courses");
    await client.query(
      `INSERT INTO "bundle_prices" (id, bundle_id, currency, amount) VALUES ($1,$2,'INR',2999.00)`,
      [randomUUID(), ids.bundle1],
    );
    track("bundle_prices");

    // ── Enrollments / progress / certificate / payment ──────────────────
    await client.query(
      `INSERT INTO "enrollments" (id, user_id, course_id, enrolled_at, status, access_start_at, is_permanent, source)
       VALUES ($1,$2,$3,now(),'ACTIVE',now(),true,'DIRECT')`,
      [ids.enrollment1, ids.student1, ids.course1],
    );
    track("enrollments");
    await client.query(
      `INSERT INTO "enrollments" (id, user_id, course_id, enrolled_at, status, access_start_at, is_permanent, source)
       VALUES ($1,$2,$3,now(),'ACTIVE',now(),true,'DIRECT')`,
      [ids.enrollment2, ids.student2, ids.course1],
    );
    track("enrollments");
    await client.query(
      `INSERT INTO "enrollment_grants" (id, enrollment_id, status, source, granted_at, access_start_at, is_permanent)
       VALUES ($1,$2,'ACTIVE','DIRECT',now(),now(),true)`,
      [ids.grant1, ids.enrollment1],
    );
    track("enrollment_grants");
    await client.query(
      `INSERT INTO "lesson_progress" (id, user_id, lesson_id, completed_at) VALUES ($1,$2,$3,now())`,
      [randomUUID(), ids.student1, ids.lesson1],
    );
    track("lesson_progress");
    await client.query(
      `INSERT INTO "certificates" (id, user_id, course_id, certificate_code, issued_at, file_url)
       VALUES ($1,$2,$3,'CERT-LEGACY-0001',now(),'https://example.test/cert.pdf')`,
      [ids.certificate1, ids.student1, ids.course1],
    );
    track("certificates");
    await client.query(
      `INSERT INTO "payments" (id, user_id, course_id, gateway, currency, amount, status, created_at)
       VALUES ($1,$2,$3,'RAZORPAY','INR',1999.00,'COMPLETED',now())`,
      [ids.payment1, ids.student1, ids.course1],
    );
    track("payments");

    // ── Cart / Order / OrderItem / OrderPayment ─────────────────────────
    await client.query(
      `INSERT INTO "carts" (id, user_id, created_at, updated_at) VALUES ($1,$2,now(),now())`,
      [ids.cart1, ids.student2],
    );
    track("carts");
    await client.query(
      `INSERT INTO "cart_items" (id, cart_id, item_type, course_id, added_at) VALUES ($1,$2,'COURSE',$3,now())`,
      [ids.cartItem1, ids.cart1, ids.course2],
    );
    track("cart_items");
    await client.query(
      `INSERT INTO "orders" (id, order_number, user_id, status, currency, subtotal, total_amount, payment_method, created_at, paid_at)
       VALUES ($1,'LEGACY-ORD-0001',$2,'PAID','INR',1999.00,1999.00,'RAZORPAY',now(),now())`,
      [ids.order1, ids.student1],
    );
    track("orders");
    await client.query(
      `INSERT INTO "order_items" (id, order_id, item_type, course_id, title_snapshot, original_price, final_price)
       VALUES ($1,$2,'COURSE',$3,'Legacy Course One',1999.00,1999.00)`,
      [ids.orderItem1, ids.order1, ids.course1],
    );
    track("order_items");
    await client.query(
      `INSERT INTO "order_payments" (id, order_id, gateway, status, created_at) VALUES ($1,$2,'RAZORPAY','COMPLETED',now())`,
      [ids.orderPayment1, ids.order1],
    );
    track("order_payments");

    // ── Coupon / redemption ──────────────────────────────────────────────
    await client.query(
      `INSERT INTO "coupons" (id, code, type, value, is_active, scope, created_by, created_at, updated_at)
       VALUES ($1,'LEGACY10','PERCENTAGE',10.00,true,'ALL',$2,now(),now())`,
      [ids.coupon1, ids.adminUser],
    );
    track("coupons");
    await client.query(
      `INSERT INTO "coupon_redemptions" (id, coupon_id, user_id, order_id, discount_amount, redeemed_at)
       VALUES ($1,$2,$3,$4,199.90,now())`,
      [ids.couponRedemption1, ids.coupon1, ids.student1, ids.order1],
    );
    track("coupon_redemptions");

    // ── Import job ────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO "import_jobs" (id, type, performed_by, status, total_rows, success_count, failure_count, created_at)
       VALUES ($1,'USER_BULK',$2,'COMPLETED',2,2,0,now())`,
      [ids.importJob1, ids.adminUser],
    );
    track("import_jobs");

    // ── Notification / campaign ──────────────────────────────────────────
    await client.query(
      `INSERT INTO "notifications" (id, internal_name, title, rich_content, priority, audience_type, status, created_by, created_at, updated_at)
       VALUES ($1,'legacy-notif','Welcome','<p>Hello</p>','NORMAL','ALL_USERS','PUBLISHED',$2,now(),now())`,
      [ids.notification1, ids.adminUser],
    );
    track("notifications");
    await client.query(
      `INSERT INTO "notification_recipients" (id, notification_id, user_id, delivered_at)
       VALUES ($1,$2,$3,now())`,
      [ids.notificationRecipient1, ids.notification1, ids.student1],
    );
    track("notification_recipients");
    await client.query(
      `INSERT INTO "email_campaigns" (id, internal_name, subject, html_content, audience_type, status, created_by, created_at, updated_at)
       VALUES ($1,'legacy-campaign','Legacy Subject','<p>Body</p>','ALL_USERS','SENT',$2,now(),now())`,
      [ids.campaign1, ids.adminUser],
    );
    track("email_campaigns");
    await client.query(
      `INSERT INTO "email_campaign_recipients" (id, campaign_id, user_id, email, send_status)
       VALUES ($1,$2,$3,'legacy-student1@example.test','SENT')`,
      [ids.campaignRecipient1, ids.campaign1, ids.student1],
    );
    track("email_campaign_recipients");

    // ── Commerce event / audit log ────────────────────────────────────
    await client.query(
      `INSERT INTO "commerce_events" (id, user_id, type, course_id, created_at) VALUES ($1,$2,'PRODUCT_VIEWED',$3,now())`,
      [ids.commerceEvent1, ids.student1, ids.course1],
    );
    track("commerce_events");
    await client.query(
      `INSERT INTO "admin_audit_logs" (id, admin_id, subscriber_id, action, target_type, target_id, target_title_snapshot, previous_status, new_status, created_at)
       VALUES ($1,$2,$3,'REVOKE_COURSE_GRANT','COURSE',$4,'Legacy Course One','ACTIVE','REVOKED',now())`,
      [ids.auditLog1, ids.adminUser, ids.student2, ids.course1],
    );
    track("admin_audit_logs");

    // ── Gamification catalog + per-user rows ────────────────────────────
    // gamification_levels/xp_rules already have defaults seeded by
    // 20260714182044_seed_gamification_defaults (orders 1-7, including code
    // "LESSON_COMPLETED") — add one more custom level rather than colliding.
    await client.query(
      `INSERT INTO "gamification_levels" (id, "order", name, min_xp, is_active) VALUES ($1,99,'Legacy Custom Level',5000,true)`,
      [randomUUID()],
    );
    track("gamification_levels");
    await client.query(
      `INSERT INTO "achievement_definitions" (id, name, description, category, unlock_criteria_json, asset_path, is_active, display_order, is_hidden, created_at, updated_at)
       VALUES ('legacy-custom-badge','First Step','Complete your first lesson','LEARNING','{"kind":"LESSON_COUNT","count":1}','/badges/first-step.svg',true,0,false,now(),now())`,
    );
    track("achievement_definitions");
    await client.query(
      `INSERT INTO "user_gamification_profiles" (user_id, total_xp, current_streak, longest_streak, total_active_days, updated_at)
       VALUES ($1,10,1,1,1,now())`,
      [ids.student1],
    );
    track("user_gamification_profiles");
    await client.query(
      `INSERT INTO "user_activity_events" (id, user_id, type, course_id, lesson_id, xp_awarded, created_at)
       VALUES ($1,$2,'LESSON_COMPLETED',$3,$4,10,now())`,
      [ids.activityEvent1, ids.student1, ids.course1, ids.lesson1],
    );
    track("user_activity_events");
    await client.query(
      `INSERT INTO "user_xp_transactions" (id, user_id, amount, reason, source_event_id, created_at)
       VALUES ($1,$2,10,'Lesson completed',$3,now())`,
      [ids.xpTransaction1, ids.student1, ids.activityEvent1],
    );
    track("user_xp_transactions");
    await client.query(
      `INSERT INTO "user_achievements" (id, user_id, achievement_id, earned_at) VALUES ($1,$2,'legacy-custom-badge',now())`,
      [randomUUID(), ids.student1],
    );
    track("user_achievements");
    await client.query(
      `INSERT INTO "user_daily_learning_activity" (id, user_id, activity_date, learning_time_seconds, lessons_completed, xp_earned, is_qualifying_day)
       VALUES ($1,$2,to_char(now(),'YYYY-MM-DD'),600,1,10,true)`,
      [ids.dailyActivity1, ids.student1],
    );
    track("user_daily_learning_activity");
    await client.query(
      `INSERT INTO "user_course_learning_time" (id, user_id, course_id, learning_time_seconds, last_activity_at)
       VALUES ($1,$2,$3,600,now())`,
      [ids.courseLearningTime1, ids.student1, ids.course1],
    );
    track("user_course_learning_time");
    await client.query(
      `INSERT INTO "user_segment_snapshots" (id, user_id, segment, snapshot_date, created_at)
       VALUES ($1,$2,'ACTIVE',to_char(now(),'YYYY-MM-DD'),now())`,
      [ids.segmentSnapshot1, ids.student1],
    );
    track("user_segment_snapshots");

    // ── Community ────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO "community_categories" (id, name, slug, is_active, visibility_type, posting_permission, created_by, created_at, updated_at)
       VALUES ($1,'General','general',true,'PUBLIC','ANYONE',$2,now(),now())`,
      [ids.category1, ids.adminUser],
    );
    track("community_categories");
    await client.query(
      `INSERT INTO "discussion_threads" (id, author_id, category_id, course_id, title, body_html, thread_type, status, created_at, updated_at, last_activity_at)
       VALUES ($1,$2,$3,$4,'Legacy Thread','<p>Question body</p>','QUESTION','ACTIVE',now(),now(),now())`,
      [ids.thread1, ids.student1, ids.category1, ids.course1],
    );
    track("discussion_threads");
    await client.query(
      `INSERT INTO "discussion_answers" (id, thread_id, author_id, body_html, created_at, updated_at)
       VALUES ($1,$2,$3,'<p>Answer body</p>',now(),now())`,
      [ids.answerPost1, ids.thread1, ids.adminUser],
    );
    track("discussion_answers");
    await client.query(
      `INSERT INTO "discussion_replies" (id, thread_id, answer_id, author_id, body_html, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'<p>Reply body</p>',now(),now())`,
      [ids.reply1, ids.thread1, ids.answerPost1, ids.student2],
    );
    track("discussion_replies");
    await client.query(
      `INSERT INTO "discussion_reactions" (id, user_id, entity_type, entity_id, reaction_type, created_at)
       VALUES ($1,$2,'THREAD',$3,'LIKE',now())`,
      [ids.reaction1, ids.student2, ids.thread1],
    );
    track("discussion_reactions");
    await client.query(
      `INSERT INTO "discussion_follows" (id, user_id, thread_id, created_at) VALUES ($1,$2,$3,now())`,
      [ids.follow1, ids.student1, ids.thread1],
    );
    track("discussion_follows");

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }

  console.log("[staging] Legacy pre-tenant data seeded. Row counts inserted:");
  for (const [table, n] of Object.entries(counts).sort()) {
    console.log(`  ${table}: ${n}`);
  }

  // Also dump total row counts for every table in the schema, for the
  // before/after migration comparison recorded in docs/multi-tenancy.md.
  const { rows } = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`,
  );
  console.log("\n[staging] Full pre-migration row counts (all tables):");
  for (const { table_name } of rows) {
    const { rows: countRows } = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM "${table_name}"`,
    );
    console.log(`  ${table_name}: ${countRows[0].count}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
