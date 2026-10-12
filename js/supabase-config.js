/**
 * Supabase config — paste your anon key HERE (only place you need to edit).
 * Get it from: Supabase Dashboard → Project Settings → API → anon public
 */
window.DFD_API = 'https://datafordummies-api.fkhambaty.workers.dev';
window.SUPABASE_URL = 'https://gfskxboxvzuwozknfulo.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmc2t4Ym94dnp1d296a25mdWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTM2NjgsImV4cCI6MjA4OTEyOTY2OH0.K01uHrgxIeXKYhr_-Wy-CLEtIqDOb_sxPniZaJBGLy4';  // ← PASTE YOUR ANON KEY BETWEEN THESE QUOTES

// Razorpay — used for Pro checkout via create-subscription Edge Function.
window.RAZORPAY_KEY_ID = 'rzp_live_SSz6o65SyXExBJ';

// Fallback: direct Razorpay subscription link used when Edge Function is unavailable.
window.RAZORPAY_SUBSCRIPTION_LINK = window.RAZORPAY_SUBSCRIPTION_LINK || 'https://razorpay.me/@datafordummies';
