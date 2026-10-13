-- Distinct people at each honest funnel step. Run in D1. No emails.
SELECT event_type,
       COUNT(*) AS events,
       COUNT(DISTINCT COALESCE(user_id, visitor_id)) AS people
FROM analytics_events
WHERE event_type IN (
  'course_view',
  'signup',
  'first_lesson',
  'pro_page',
  'checkout',
  'active_subscription'
)
GROUP BY event_type
ORDER BY event_type;
