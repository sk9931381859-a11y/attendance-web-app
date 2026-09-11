# Technical Specification & Constraints

## Stack & PWA
* Framework: Next.js 14 App Router, Tailwind CSS, Supabase (PostgreSQL, Auth, Edge Functions)
* Target: Progressive Web App (PWA) on mobile browsers without app stores.

## Schema
* `profiles`: `id` (uuid), `name` (text), `shift_start_time` (time)
* `attendance_logs`: `id` (uuid), `teacher_id` (uuid), `check_in_time` (timestamp with time zone), `status` (text: present, late, absent)

## Core Capabilities
* Anti-Cheat Kiosk: TOTP QR code updating every 30 seconds.
* Geofencing Verification: Supabase Edge Function validating mobile GPS proximity before logging check-in.
* Principal Dashboard: Real-time status for today (Present, Late, Absent).
* Absent Automation: Daily 09:00 AM `pg_cron` marking absent teachers.

## Absolute Subagent Invariants
* Zero Cost: Must only use free-tier cloud resources.
* Review Artifacts: Must generate "Database Schema Artifacts" or "Browser Recording Artifacts" for review before finalizing code.
