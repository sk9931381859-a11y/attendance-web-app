# Attendance Web App - Project Knowledge Base & Rules

## Project Overview & Core Architecture
* **Application:** Mobile-first Attendance Web App for tracking teacher check-ins with anti-cheat and geofencing.
* **Stack:** Next.js 14 (App Router), Tailwind CSS, Supabase (PostgreSQL, Auth, Edge Functions).
* **Format:** Progressive Web App (PWA) configured to run reliably on mobile browsers without requiring native app stores.

---

## Database Specification (Supabase PostgreSQL)
* **`profiles` table:**
  * `id`: `uuid` (Primary Key, matches Supabase Auth user ID)
  * `name`: `text` (Teacher / user full name)
  * `shift_start_time`: `time` (Scheduled shift start time)
* **`attendance_logs` table:**
  * `id`: `uuid` (Primary Key, default `gen_random_uuid()`)
  * `teacher_id`: `uuid` (Foreign Key -> `profiles.id`)
  * `check_in_time`: `timestamp with time zone` (Timestamp when check-in occurred)
  * `status`: `text` (Allowed values: `'present'`, `'late'`, `'absent'`)

---

## Feature Specifications
1. **Anti-Cheat Kiosk:**
   * Lobby screen displaying a dynamically refreshing QR code based on Time-based One-Time Password (TOTP) algorithm.
   * QR code rotation period: strictly every 30 seconds.
2. **Geofencing Verification:**
   * Supabase Edge Function verifying mobile device GPS coordinates against predefined building perimeter/coordinates prior to committing check-in records to `attendance_logs`.
3. **Principal's Dashboard:**
   * Real-time dashboard interface showing live attendance breakdown for today only (`Present`, `Late`, `Absent`).
4. **Absent Automation:**
   * PostgreSQL `pg_cron` scheduled job configured to execute daily at 09:00 AM.
   * Automatically identifies teachers with missing check-ins for the day and creates/updates records with `status = 'absent'`.

---

## Absolute Constraints for All Agents and Subagents

> [!IMPORTANT]
> The following rules are non-negotiable constraints that apply to the primary agent and all spawned subagents (`self`, `research`, and custom subagents).

1. **Zero Cost Constraint:**
   * Only free-tier cloud resources and services are permitted.
   * Never introduce paid cloud services, paid tiers, billable external APIs, or paywalled third-party integrations.
   * All Supabase, Next.js, hosting, and compute capabilities must operate comfortably within zero-cost free-tier limits.

2. **Agentic Workflow & Review Artifacts:**
   * Before finalizing any database changes or migrations, output a dedicated **Database Schema Artifact** for user review.
   * Before finalizing user-facing UI or interactive workflows, provide visual verification artifacts (**Browser Recording Artifacts** or visual walkthroughs with screenshots).
   * Do not commit untested or unverified schema/feature changes without providing the required review artifacts.

3. **Strict Stack & Platform Boundaries:**
   * Adhere strictly to Next.js 14 App Router, Tailwind CSS, and Supabase.
   * Preserve PWA compatibility for mobile browser access.
