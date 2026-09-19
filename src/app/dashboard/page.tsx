'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import {
  Building2,
  BarChart2,
  LogOut,
  RefreshCw,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  Search,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOutAction } from '@/app/actions/auth';

interface TeacherRow {
  id: string;
  name: string;
  hash: string;
  shift: string;
  checkInTime: string;
  status: 'Pending' | 'Absent' | 'Present' | 'Late';
}

export default function DashboardPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string>('11111111-1111-1111-1111-111111111111');
  const [companyName, setCompanyName] = useState<string>('');

  const [staffRows, setStaffRows] = useState<TeacherRow[]>([]);
  const [totalStaff, setTotalStaff] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'pending'>('all');
  const [currentTime, setCurrentTime] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoggingOut, startLogout] = useTransition();

  // Helper to format current time
  const formatTime = () => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date());
  };

  /**
   * Fetches live data from Supabase:
   * 1. Profiles (all registered staff for active company)
   * 2. Today's attendance logs (created_at matches today for active company)
   * Calculates metrics and maps data table rows.
   */
  const fetchDashboardData = useCallback(async (targetCompanyId?: string) => {
    try {
      const supabase = createClient();

      let activeCompanyId = targetCompanyId || companyId;
      if (!targetCompanyId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('company_id, companies:company_id(name)')
            .eq('id', user.id)
            .maybeSingle();

          if (prof?.company_id) {
            activeCompanyId = prof.company_id;
            setCompanyId(prof.company_id);
            if ((prof as any).companies?.name) {
              setCompanyName((prof as any).companies.name);
            }
          }
        }
      }

      // 1. Fetch all staff from public.profiles scoped to active company
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, name, shift_start_time, role, company_id')
        .eq('company_id', activeCompanyId)
        .order('name', { ascending: true });

      if (pError) {
        console.error('Error fetching staff profiles:', pError);
        return;
      }

      // 2. Fetch today's check-ins from public.attendance_logs scoped to active company
      const now = new Date();
      const todayIso = now.toISOString().split('T')[0];
      const startOfToday = `${todayIso}T00:00:00.000Z`;
      const endOfToday = `${todayIso}T23:59:59.999Z`;

      const { data: logs, error: lError } = await supabase
        .from('attendance_logs')
        .select('id, teacher_id, check_in_time, status, is_late, minutes_late, created_at, company_id')
        .eq('company_id', activeCompanyId)
        .gte('created_at', startOfToday)
        .lte('created_at', endOfToday)
        .order('created_at', { ascending: false });

      if (lError) {
        console.error('Error fetching today attendance logs:', lError);
      }

      // Map logs by teacher_id (most recent log per teacher for today)
      const logsMap = new Map<string, NonNullable<typeof logs>[number]>();
      (logs || []).forEach((log) => {
        if (!logsMap.has(log.teacher_id)) {
          logsMap.set(log.teacher_id, log);
        }
      });

      let calculatedPresent = 0;
      let calculatedLate = 0;
      let calculatedAbsent = 0;

      const mappedRows: TeacherRow[] = (profiles || []).map((teacher) => {
        const log = logsMap.get(teacher.id);
        let status: 'Pending' | 'Present' | 'Late' | 'Absent' = 'Pending';
        let checkInFormatted = '--:--:--';

        if (log) {
          // Format check-in timestamp
          if (log.check_in_time) {
            const checkInDate = new Date(log.check_in_time);
            if (!isNaN(checkInDate.getTime())) {
              checkInFormatted = new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              }).format(checkInDate);
            }
          }

          // Lateness is evaluated by Postgres BEFORE INSERT trigger (is_late = true)
          if (log.status === 'absent') {
            status = 'Absent';
            calculatedAbsent++;
          } else if ((log as any).is_late === true || log.status === 'late') {
            status = 'Late';
            calculatedLate++;
          } else {
            status = 'Present';
            calculatedPresent++;
          }
        }

        return {
          id: teacher.id,
          name: teacher.name,
          hash: `${teacher.id.substring(0, 7)}...`,
          shift: teacher.shift_start_time || '08:00:00',
          checkInTime: checkInFormatted,
          status,
        };
      });

      const total = profiles?.length || 0;
      const calculatedPending = Math.max(
        0,
        total - (calculatedPresent + calculatedLate + calculatedAbsent)
      );

      setTotalStaff(total);
      setPresentCount(calculatedPresent);
      setLateCount(calculatedLate);
      setAbsentCount(calculatedAbsent);
      setPendingCount(calculatedPending);
      setStaffRows(mappedRows);
      setCurrentTime(formatTime());
    } catch (err) {
      console.error('Failed to fetch live dashboard data:', err);
    }
  }, [companyId]);

  // Initial load & Supabase Realtime channel subscription
  useEffect(() => {
    let activeChannel: any = null;

    const setupDashboard = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let activeCompanyId = companyId;
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('company_id, companies:company_id(name)')
          .eq('id', user.id)
          .maybeSingle();

        if (prof?.company_id) {
          activeCompanyId = prof.company_id;
          setCompanyId(prof.company_id);
          if ((prof as any).companies?.name) {
            setCompanyName((prof as any).companies.name);
          }
        }
      }

      await fetchDashboardData(activeCompanyId);

      // Ensure the Supabase Realtime channel subscription filters events specifically for the active company:
      // channel('realtime:attendance').on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs', filter: `company_id=eq.${companyId}` }, ...)
      activeChannel = supabase
        .channel('realtime:attendance')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance_logs',
            filter: `company_id=eq.${activeCompanyId}`,
          },
          (payload) => {
            console.log('Realtime attendance_logs change received for company:', payload);
            fetchDashboardData(activeCompanyId);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `company_id=eq.${activeCompanyId}`,
          },
          (payload) => {
            console.log('Realtime profiles change received for company:', payload);
            fetchDashboardData(activeCompanyId);
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
        });
    };

    setupDashboard();

    return () => {
      if (activeChannel) {
        const supabase = createClient();
        supabase.removeChannel(activeChannel);
      }
    };
  }, [fetchDashboardData, companyId]);

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData(companyId);
    setIsRefreshing(false);
  };

  // Sign out Handler
  const handleSignOut = () => {
    startLogout(async () => {
      await signOutAction();
    });
  };

  // Filter staff rows
  const filteredRows = staffRows.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFilter === 'all') return matchesSearch;
    return matchesSearch && row.status.toLowerCase() === selectedFilter.toLowerCase();
  });

  // Dynamic Percentage calculations
  const presentLatePct =
    totalStaff > 0
      ? Math.round(((presentCount + lateCount) / totalStaff) * 100)
      : 0;

  const presentRosterPct =
    totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0;

  return (
    <div className="text-gray-900 font-sans pb-12">
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER                                                            */}
      {/* ========================================================================= */}
      <div className="mt-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Left: Title + Realtime Connected badge + Subtext */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Principal&apos;s Live Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-amber-400'
                  } opacity-75`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
              {isConnected ? 'Realtime Connected' : 'Connecting Realtime...'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time daily attendance monitoring, anti-cheet logs, and status breakdown.
          </p>
        </div>

        {/* Right: Updated time + Black Refresh button */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs text-gray-500 font-mono">
            Updated: {currentTime || 'Loading...'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold transition shadow-sm"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. METRIC CARDS GRID (5 SPECIFIC CARDS DYNAMICALLY INJECTED)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 px-6 mt-6">
        {/* Card 1: Total Staff */}
        <div className="bg-slate-400/20 text-slate-800 rounded-xl p-4 flex flex-col justify-between border border-slate-300/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">Total Staff</span>
            <Users size={18} className="text-slate-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 mb-1">
              {totalStaff} Registered
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              ~ {presentLatePct}% Present / Late
            </p>
          </div>
        </div>

        {/* Card 2: Present */}
        <div className="bg-green-600 text-white rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-green-100">Present</span>
            <CheckCircle size={18} className="text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-white mb-1">
              {presentCount} Staff
            </div>
            <p className="text-[11px] text-green-100 font-medium">
              {presentRosterPct}% of roster
            </p>
          </div>
        </div>

        {/* Card 3: Late */}
        <div className="bg-yellow-400 text-black rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-yellow-950">Late</span>
            <Clock size={18} className="text-black" />
          </div>
          <div>
            <div className="text-xl font-bold text-black mb-1">
              {lateCount} Staff
            </div>
            <p className="text-[11px] text-yellow-950/80 font-medium">
              Past scheduled start time
            </p>
          </div>
        </div>

        {/* Card 4: Absent */}
        <div className="bg-red-600 text-white rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-red-100">Absent</span>
            <XCircle size={18} className="text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-white mb-1">
              {absentCount} Staff
            </div>
            <p className="text-[11px] text-red-100 font-medium">
              Auto-marked via 09:00 AM cron
            </p>
          </div>
        </div>

        {/* Card 5: Pending */}
        <div className="bg-slate-300 text-slate-800 rounded-xl p-4 flex flex-col justify-between border border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">Pending</span>
            <HelpCircle size={18} className="text-slate-700" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 mb-1">
              {pendingCount} Awaiting
            </div>
            <p className="text-[11px] text-slate-700 font-medium">
              No check-in record yet
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DATA TABLE SECTION (MAPPED TO PROFILES & ATTENDANCE LOGS)             */}
      {/* ========================================================================= */}
      <div className="mt-8 px-6 pb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-gray-200 gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teacher by name..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black placeholder:text-gray-400 bg-white text-gray-900"
              />
            </div>

            {/* Row of Black Filter Pills with Dynamic Counts */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'all'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({totalStaff})
              </button>
              <button
                onClick={() => setSelectedFilter('present')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'present'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Present ({presentCount})
              </button>
              <button
                onClick={() => setSelectedFilter('late')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'late'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Late ({lateCount})
              </button>
              <button
                onClick={() => setSelectedFilter('absent')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'absent'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Absent ({absentCount})
              </button>
              <button
                onClick={() => setSelectedFilter('pending')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'pending'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    STAFF NAME
                  </th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    SHIFT START
                  </th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    CHECK-IN TIME
                  </th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    DETAILS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-gray-500">
                      No staff members match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/75 transition">
                      {/* Staff Name + Hash */}
                      <td className="py-4 px-6">
                        <div className="text-sm font-bold text-red-800">
                          {row.name}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {row.hash}
                        </div>
                      </td>

                      {/* Shift Start */}
                      <td className="py-4 px-6 text-xs text-gray-700 font-mono">
                        {row.shift}
                      </td>

                      {/* Check-In Time */}
                      <td className="py-4 px-6 text-xs text-gray-600 font-mono">
                        {row.checkInTime}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {row.status === 'Pending' && (
                          <div className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                            <span className="text-xs font-medium text-gray-800">
                              Pending
                            </span>
                          </div>
                        )}
                        {row.status === 'Absent' && (
                          <div className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                            <span className="text-xs font-medium text-gray-800">
                              Absent
                            </span>
                          </div>
                        )}
                        {row.status === 'Present' && (
                          <div className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
                            <span className="text-xs font-medium text-gray-800">
                              Present
                            </span>
                          </div>
                        )}
                        {row.status === 'Late' && (
                          <div className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                            <span className="text-xs font-medium text-gray-800">
                              Late
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Details */}
                      <td className="py-4 px-6 text-right">
                        <Link
                          href="/dashboard/manage"
                          className="text-teal-600 hover:text-teal-700 font-medium text-xs hover:underline inline-flex items-center gap-0.5"
                        >
                          View Log ↗
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
