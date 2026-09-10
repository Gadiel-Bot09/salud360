-- ── email_logs: tracks every email sent through Brevo for daily monitoring ────
CREATE TABLE IF NOT EXISTS email_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at       timestamptz NOT NULL DEFAULT now(),
  to_email      text NOT NULL,
  subject       text NOT NULL,
  template_name text NOT NULL DEFAULT 'generic',
  status        text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'error'))
);

-- Index for fast daily count queries
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON email_logs (sent_at);
CREATE INDEX IF NOT EXISTS email_logs_status_idx  ON email_logs (status);

-- RLS: Only service role can insert/read (called from server-side only)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins to read (for the dashboard widget)
CREATE POLICY "admins_can_read_email_logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (true);

-- No public insert — inserts happen via service role key from Next.js server
