# Attendance Web App Technical Specification

## 1. Core Architecture
* **Stack:** Next.js 14 (App Router), Tailwind CSS, Supabase (PostgreSQL, Auth).
* **Format:** Progressive Web App (PWA) to run on mobile browsers without app stores.

## 2. Database Schema (Supabase)
* **profiles:** `id` (uuid), `name` (text), `shift_start_time` (time).
* **attendance_logs:** `id` (uuid), `teacher_id` (uuid), `check_in_time` (timestamp with time zone), `status` (text: present, late, absent).

## 3. Key Features
* **Anti-Cheat Kiosk:** A lobby screen displaying a QR code (TOTP) that changes every 30 seconds.
* **Geofencing Verification:** A Supabase Edge Function that checks the phone's GPS distance from the building before saving the check-in.
* **Principal's Dashboard:** A real-time screen showing who is Present, Late, and Absent for today only.
* **Absent Automation:** A `pg_cron` database job that runs daily at 09:00 AM to automatically mark any missing teachers as "absent".

## 4. Strict Development Rules
* **Zero Cost:** The agent must only use free-tier cloud resources.
* **Agentic Workflow:** Output "Database Schema Artifacts" or "Browser Recording Artifacts" for review before finalizing code.