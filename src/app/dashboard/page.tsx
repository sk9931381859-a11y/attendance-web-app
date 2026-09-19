'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  ExternalLink,
  BookOpen,
  CalendarClock,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  Building,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AttendanceRow {
  id: string;
  teacherId: string;
  name: string;
  email: string;
  designation: string;
  shift: string;
  checkInTime: string;
  status: 'ON TIME' | 'LATE' | 'ABSENT' | 'PENDING';
  minutesLate: number;
}

interface ActivityItem {
  id: string;
  type: 'checkin_ontime' | 'checkin_late' | 'syllabus' | 'leave';
  actorName: string;
  title: string;
  description: string;
  badge: string;
  timestamp: string;
  relativeTime: string;
  rawTime: Date;
}

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-cyan-600',
];

export default function DashboardOverviewPage() {
  const [schoolId, setSchoolId] = useState<string>('11111111-1111-1111-1111-111111111111');
  const [schoolName, setSchoolName] = useState<string>('Apex Global Academy');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [currentClock, setCurrentClock] = useState<string>('');

  // Metrics
  const [totalStaff, setTotalStaff] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [totalLopCount, setTotalLopCount] = useState(0);
  const [totalLopDays, setTotalLopDays] = useState(0);

  // Rows and Feeds
  const [staffRows, setStaffRows] = useState<AttendanceRow[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ON TIME' | 'LATE' | 'ABSENT' | 'PENDING'>('all');

  // Digital clock update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentClock(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute initials and color from name
  const getAvatarMeta = useCallback((name: string) => {
    const cleaned = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim();
    const parts = cleaned.split(' ');
    const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : cleaned.slice(0, 2);
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
    return {
      initials: initials.toUpperCase(),
      bgColor: AVATAR_COLORS[colorIndex],
    };
  }, []);

  // Format relative time helper
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1m ago';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1h ago';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  /**
   * Main Data Fetcher
   * Fetches:
   * 1. Profiles (Registered staff)
   * 2. Today's Attendance Logs (Anti-cheat kiosk punches)
   * 3. Pending Leave Requests
   * 4. Chapter Progress (Recent syllabus milestones)
   */
  const loadDashboardData = useCallback(async (targetSchoolId?: string) => {
    try {
      const supabase = createClient();
      let activeSchoolId = targetSchoolId || schoolId;

      if (!targetSchoolId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('school_id, schools:school_id(name)')
            .eq('id', user.id)
            .maybeSingle();

          if (prof?.school_id) {
            activeSchoolId = prof.school_id;
            setSchoolId(prof.school_id);
            if ((prof as any).schools?.name) {
              setSchoolName((prof as any).schools.name);
            }
          }
        }
      }

      // Date ranges for today in UTC
      const now = new Date();
      const todayIso = now.toISOString().split('T')[0];
      const startOfToday = `${todayIso}T00:00:00.000Z`;
      const endOfToday = `${todayIso}T23:59:59.999Z`;

      // 1. Fetch Staff Profiles
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name, email, designation, shift_start_time, role, school_id')
        .eq('school_id', activeSchoolId)
        .order('name', { ascending: true });

      if (profError) {
        console.error('Error fetching staff profiles:', profError);
      }

      // 2. Fetch Today's Attendance Logs
      const { data: todayLogs, error: logError } = await supabase
        .from('attendance_logs')
        .select('id, teacher_id, check_in_time, status, is_late, minutes_late, created_at, school_id')
        .eq('school_id', activeSchoolId)
        .gte('created_at', startOfToday)
        .lte('created_at', endOfToday)
        .order('created_at', { ascending: false });

      if (logError) {
        console.error('Error fetching attendance logs:', logError);
      }

      // 3. Fetch Pending Leave Requests
      const { data: leaves, error: leaveError } = await supabase
        .from('leave_requests')
        .select('id, staff_id, leave_type, reason, status, applied_at, profiles(name, designation)')
        .eq('school_id', activeSchoolId)
        .eq('status', 'pending')
        .order('applied_at', { ascending: false });

      if (leaveError) {
        console.error('Error fetching leave requests:', leaveError);
      }
      setPendingLeavesCount(leaves?.length || 0);

      // 4. Fetch Recent Chapter Progress
      const { data: chaptersProgress, error: chapError } = await supabase
        .from('chapter_progress')
        .select('id, chapter_id, staff_id, theory_completed, qa_completed, notebooks_checked, created_at, chapters(title, chapter_number), profiles(name, designation)')
        .eq('school_id', activeSchoolId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (chapError) {
        console.error('Error fetching chapter progress:', chapError);
      }

      // 5. Build Attendance Rows & Metrics
      const staffMembers = (profiles || []).filter((p) => p.role !== 'admin');
      const totalRegistered = staffMembers.length;

      const logByTeacherId = new Map<string, NonNullable<typeof todayLogs>[number]>();
      (todayLogs || []).forEach((log) => {
        if (!logByTeacherId.has(log.teacher_id)) {
          logByTeacherId.set(log.teacher_id, log);
        }
      });

      let calculatedPresent = 0;
      let calculatedLate = 0;
      let calculatedAbsent = 0;

      const rows: AttendanceRow[] = staffMembers.map((member) => {
        const log = logByTeacherId.get(member.id);
        let status: 'ON TIME' | 'LATE' | 'ABSENT' | 'PENDING' = 'PENDING';
        let formattedCheckIn = '--:--:--';
        let minutesLate = 0;

        if (log) {
          if (log.check_in_time) {
            const dateObj = new Date(log.check_in_time);
            if (!isNaN(dateObj.getTime())) {
              formattedCheckIn = dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              });
            }
          }

          if (log.status === 'absent') {
            status = 'ABSENT';
            calculatedAbsent++;
          } else if (log.is_late || log.status === 'late' || (log.minutes_late && log.minutes_late > 0)) {
            status = 'LATE';
            minutesLate = log.minutes_late || 15;
            calculatedLate++;
          } else {
            status = 'ON TIME';
            calculatedPresent++;
          }
        }

        return {
          id: member.id,
          teacherId: member.id,
          name: member.name || 'Unnamed Faculty',
          email: member.email || '',
          designation: member.designation || 'Faculty Member',
          shift: member.shift_start_time ? `${member.shift_start_time.slice(0, 5)} AM - 04:00 PM` : '08:00 AM - 04:00 PM',
          checkInTime: formattedCheckIn,
          status,
          minutesLate,
        };
      });

      const calculatedPending = Math.max(0, totalRegistered - (calculatedPresent + calculatedLate + calculatedAbsent));

      // Compute LOP count and days (e.g. 1 absent = 1 LOP day, 3 lates = 1 LOP day)
      const totalLops = calculatedAbsent + calculatedLate;
      const computedLopDays = calculatedAbsent * 1.0 + Math.floor(calculatedLate / 3) * 1.0 + (calculatedLate % 3) * 0.33;

      setTotalStaff(totalRegistered);
      setPresentCount(calculatedPresent);
      setLateCount(calculatedLate);
      setAbsentCount(calculatedAbsent);
      setPendingCount(calculatedPending);
      setTotalLopCount(totalLops);
      setTotalLopDays(Math.round(computedLopDays * 10) / 10);
      setStaffRows(rows);

      // 6. Build Recent Activity Feed (Interleaving Check-ins, Leaves, Syllabus Progress)
      const feedItems: ActivityItem[] = [];

      // Check-in activities from today's logs
      (todayLogs || []).forEach((log) => {
        const staff = staffMembers.find((s) => s.id === log.teacher_id);
        const staffName = staff?.name || 'Faculty Member';
        const dateObj = new Date(log.check_in_time || log.created_at);
        const timeStr = dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const isLate = log.is_late || log.status === 'late';
        feedItems.push({
          id: `log-${log.id}`,
          type: isLate ? 'checkin_late' : 'checkin_ontime',
          actorName: staffName,
          title: isLate ? 'Punched in Past Shift Start' : 'Punched in on Time',
          description: isLate
            ? `Arrived ${log.minutes_late || 15}m late at front desk kiosk`
            : 'Geofenced kiosk QR scan verified',
          badge: isLate ? `Late (+${log.minutes_late || 15}m)` : 'On Time',
          timestamp: timeStr,
          relativeTime: getRelativeTime(dateObj),
          rawTime: dateObj,
        });
      });

      // Syllabus progress activities
      (chaptersProgress || []).forEach((prog) => {
        const staffName = (prog as any).profiles?.name || 'Faculty Member';
        const chapterTitle = (prog as any).chapters?.title || 'Class Curriculum';
        const chapterNum = (prog as any).chapters?.chapter_number || 1;
        const dateObj = new Date(prog.created_at);
        const timeStr = dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        feedItems.push({
          id: `prog-${prog.id}`,
          type: 'syllabus',
          actorName: staffName,
          title: `Ch. ${chapterNum}: ${chapterTitle}`,
          description: prog.theory_completed && prog.qa_completed
            ? 'Completed Theory & Student Q&A'
            : prog.theory_completed
            ? 'Completed Lecture Theory Modules'
            : 'Updated syllabus milestone tracking',
          badge: 'Syllabus Progress',
          timestamp: timeStr,
          relativeTime: getRelativeTime(dateObj),
          rawTime: dateObj,
        });
      });

      // Pending Leave Requests
      (leaves || []).forEach((leave) => {
        const staffName = (leave as any).profiles?.name || 'Faculty Member';
        const dateObj = new Date(leave.applied_at);
        const timeStr = dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        feedItems.push({
          id: `leave-${leave.id}`,
          type: 'leave',
          actorName: staffName,
          title: `Requested ${leave.leave_type}`,
          description: leave.reason || 'Pending formal Principal review',
          badge: 'Leave Request',
          timestamp: timeStr,
          relativeTime: getRelativeTime(dateObj),
          rawTime: dateObj,
        });
      });

      // Sort chronological descending
      feedItems.sort((a, b) => b.rawTime.getTime() - a.rawTime.getTime());
      setActivityFeed(feedItems.slice(0, 10));

      setLastRefreshedAt(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    } catch (err) {
      console.error('Failed to load dashboard overview data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [schoolId]);

  // Initial load + Supabase Realtime subscription
  useEffect(() => {
    loadDashboardData();

    const supabase = createClient();
    const channel = supabase
      .channel('realtime:principal_overview')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        () => loadDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        () => loadDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chapter_progress' },
        () => loadDashboardData()
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  // Handle manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
  };

  // Filter staff rows
  const filteredRows = useMemo(() => {
    return staffRows.filter((row) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        row.name.toLowerCase().includes(q) ||
        row.designation.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q);

      if (statusFilter === 'all') return matchesQuery;
      return matchesQuery && row.status === statusFilter;
    });
  }, [staffRows, searchQuery, statusFilter]);

  const onTimeRatioPct = totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0;

  return (
    <div className="w-full min-h-full bg-slate-50 p-6 sm:p-8 font-sans antialiased text-slate-900 space-y-8">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE DASHBOARD HEADER                                             */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Principal&apos;s Live Dashboard
            </h1>
            {/* Live Realtime Pulsing Status */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  } opacity-75`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span>{isConnected ? 'Live Telemetry Active' : 'Connecting Stream...'}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2">
            <Building size={14} className="text-slate-400" />
            <span>{schoolName} &bull; Anti-Cheat Kiosk &amp; Biometric Monitoring</span>
          </p>
        </div>

        {/* Right Side: Current Clock & Manual Refresh Button */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono font-bold text-slate-700">{currentClock || '--:--:--'}</div>
            <div className="text-[11px] text-slate-400">
              Synced: {lastRefreshedAt || 'Just now'}
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs transition active:scale-95 disabled:opacity-50"
            title="Refresh Live Telemetry"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP KPI GRID (4 SPECIFIC METRIC CARDS)                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Registered Staff */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/90 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Registered Staff
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? '...' : totalStaff}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-600">Active Faculty &amp; Staff</span>
              <span className="font-semibold text-slate-700">100% Roster</span>
            </div>
          </div>
        </div>

        {/* Card 2: Present Today (Green indicator) */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/90 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Present Today
            </span>
            {/* Green indicator badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verified</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {isLoading ? '...' : presentCount}
              </div>
              <span className="text-xs font-medium text-slate-400">
                / {totalStaff} scheduled
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>{onTimeRatioPct}% of roster on time on premises</span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Leave Requests (Yellow indicator) */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/90 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Leave Requests
            </span>
            {/* Yellow indicator badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Action Req.</span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? '...' : pendingLeavesCount}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <Clock size={13} className="text-amber-600 shrink-0" />
                Awaiting Principal sign-off
              </span>
              <Link
                href="/dashboard/oversight"
                className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline hover:no-underline"
              >
                Review &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Card 4: Total LOP Deductions (Red indicator) */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/90 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total LOP Deductions
            </span>
            {/* Red indicator badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Loss of Pay</span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? '...' : `${totalLopCount} Penalty Units`}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-rose-700 font-medium flex items-center gap-1">
                <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                {totalLopDays} cumulative LOP days
              </span>
              <Link
                href="/dashboard/payroll"
                className="text-xs font-semibold text-rose-800 hover:text-rose-950 underline hover:no-underline"
              >
                Payroll &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT AREA: SPLIT LAYOUT (2/3 TABLE + 1/3 ACTIVITY FEED)       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN (2/3 WIDTH): LIVE TODAY'S ATTENDANCE TABLE                  */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col">
            {/* Table Header / Toolbar */}
            <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    {"Live Today's Attendance"}
                  </h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    {staffRows.length} Registered
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time anti-cheat TOTP QR verified check-ins and scheduled shift pacing.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search faculty by name..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            {/* Filter Pills Bar */}
            <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-200/80 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold mr-1 text-[11px] uppercase tracking-wider">
                Filter:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All ({staffRows.length})
              </button>
              <button
                onClick={() => setStatusFilter('ON TIME')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  statusFilter === 'ON TIME'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                On Time ({presentCount})
              </button>
              <button
                onClick={() => setStatusFilter('LATE')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  statusFilter === 'LATE'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-red-800 border border-red-200 hover:bg-red-50'
                }`}
              >
                Late ({lateCount})
              </button>
              <button
                onClick={() => setStatusFilter('ABSENT')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  statusFilter === 'ABSENT'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                Absent ({absentCount})
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Staff Member</th>
                    <th className="py-3 px-4">Shift Schedule</th>
                    <th className="py-3 px-4">Punch-In Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                        No faculty records match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const avatar = getAvatarMeta(row.name);

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Staff Name & Avatar */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full ${avatar.bgColor} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}
                              >
                                {avatar.initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 text-sm truncate">
                                  {row.name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {row.designation}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Shift Schedule */}
                          <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Clock size={13} className="text-slate-400" />
                              <span>{row.shift}</span>
                            </div>
                          </td>

                          {/* Punch-In Time */}
                          <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-700">
                            {row.checkInTime}
                          </td>

                          {/* Pill-shaped Status Badge */}
                          <td className="py-3.5 px-4">
                            {row.status === 'ON TIME' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                <span>ON TIME</span>
                              </span>
                            )}
                            {row.status === 'LATE' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200/80 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                <span>LATE (+{row.minutesLate}m)</span>
                              </span>
                            )}
                            {row.status === 'ABSENT' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>ABSENT</span>
                              </span>
                            )}
                            {row.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>NOT PUNCHED</span>
                              </span>
                            )}
                          </td>

                          {/* Action Link */}
                          <td className="py-3.5 px-5 text-right">
                            <Link
                              href="/dashboard/manage"
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-600 transition"
                            >
                              <span>Inspect</span>
                              <ArrowUpRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredRows.length} of {staffRows.length} staff members</span>
              <Link
                href="/dashboard/manage"
                className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Open Full Staff Directory</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN (1/3 WIDTH): RECENT ACTIVITY FEED                          */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-5 flex flex-col h-full">
            {/* Feed Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Recent Activity Feed
                </h2>
                <p className="text-[11px] text-slate-500">
                  Live timestamps for check-ins &amp; syllabus progress.
                </p>
              </div>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>

            {/* Activity Feed Timeline */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {activityFeed.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No activity events recorded yet today.
                </div>
              ) : (
                activityFeed.map((item) => {
                  let iconNode = (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <UserCheck size={14} />
                    </div>
                  );

                  if (item.type === 'checkin_late') {
                    iconNode = (
                      <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                        <Clock size={14} />
                      </div>
                    );
                  } else if (item.type === 'syllabus') {
                    iconNode = (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <BookOpen size={14} />
                      </div>
                    );
                  } else if (item.type === 'leave') {
                    iconNode = (
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <CalendarClock size={14} />
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="flex items-start gap-3 text-xs">
                      {iconNode}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-slate-900 truncate">
                            {item.actorName}
                          </span>
                          <span className="text-[10px] font-mono font-medium text-slate-600 shrink-0">
                            {item.timestamp}
                          </span>
                        </div>
                        <div className="text-slate-600 font-medium text-[11px] mt-0.5">
                          {item.title}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Feed Footer */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Continuous feed polling</span>
              <Link
                href="/dashboard/oversight"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>Academic Oversight</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
