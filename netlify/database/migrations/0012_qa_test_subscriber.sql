-- 0012_qa_test_subscriber.sql
-- Creates a known QA test subscriber account so Marcus acceptance scenarios
-- M-01 through M-06 can be run without a real PayPal payment.
--
-- Test credentials (share only with QA personnel):
--   Email:    qa-subscriber@govscout.pro
--   Password: GovScout_QA_2026!
--   Role:     user  (NOT admin — tests the real subscriber gate)
--
-- The password_hash below is bcrypt(cost=10) of "GovScout_QA_2026!"
-- Rotate the hash (and update this comment) after each test cycle.
--
-- Safe to run multiple times (ON CONFLICT DO UPDATE).

INSERT INTO users (
  email,
  subscription_status,
  role,
  password_hash,
  email_verified
)
VALUES (
  'qa-subscriber@govscout.pro',
  'active',
  'user',
  '$2b$10$Y4Z9qgfLGSPdjdHobSU9q.Z8R5DRw5qKq63o/6noNf6E80YNYY3Be',
  TRUE
)
ON CONFLICT (email) DO UPDATE
  SET subscription_status = 'active',
      password_hash        = '$2b$10$Y4Z9qgfLGSPdjdHobSU9q.Z8R5DRw5qKq63o/6noNf6E80YNYY3Be',
      email_verified       = TRUE,
      role                 = 'user';
