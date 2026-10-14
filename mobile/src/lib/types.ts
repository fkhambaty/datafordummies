/** Mirrors publicProfile() in cloudflare/worker/src/index.js. */
export type Profile = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  country_code: string | null;
  role: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  subscription_cancel_at_cycle_end: boolean;
  updated_at: string | null;
};

/** The object js/supabase-auth.js keeps in localStorage under dfd_session. */
export type WebSession = {
  token: string;
  user: Profile;
};

export type CourseProgress = {
  course_id: string;
  last_lesson_id: string | null;
  last_lesson_label: string | null;
  completed_lesson_ids: string[];
  progress_pct: number | null;
  last_visited_at: string | null;
};

export type CertificateEvidence = {
  lesson_id: string;
  completed_at: string;
};

export type CertificateRequest = {
  id: string;
  course_id: string;
  course_title: string;
  status: 'requested' | 'issued';
  requested_at: string;
  issued_at: string | null;
  evidence: CertificateEvidence[];
};
