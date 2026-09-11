'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Search,
  RefreshCw,
  Radio,
  Calendar,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getTodayAttendanceSummaryAction, DashboardSummary, StaffAttendanceItem } from '@/app/actions/dashboard';

interface PrincipalDashboardProps {
  initialData: DashboardSummary;
}

export default function PrincipalDashboard({ initialData }: PrincipalDashboardProps) {
  const [data, setData] = useState<DashboardSummary>(initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'pending'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const summary = await getTodayAttendanceSummaryAction();
      setData(summary);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    try {
      const supabase = createClient();
      const channel = supabase
        .channel('principal-attendance-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_logs' },
          (payload) => {
            console.log('Realtime change detected in attendance_logs:', payload);
            refreshData();
          }
        )
        .subscribe((status) => {
          setIsRealtimeActive(status === 'SUBSCRIBED');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime subscription unavailable:', err);
    }
  }, [refreshData]);

  // Filter staff list
  const filteredStaff = useMemo(() => {
    return data.staffList.filter((staff) => {
      const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = statusFilter === 'all' || staff.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [data.staffList, searchQuery, statusFilter]);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5" />
            {todayFormatted}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Principal&apos;s Live Dashboard
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                isRealtimeActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              <Radio className={`w-3 h-3 ${isRealtimeActive ? 'animate-pulse text-emerald-400' : ''}`} />
              {isRealtimeActive ? 'Realtime Connected' : 'Connecting Realtime...'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time daily attendance monitoring, anti-cheat logs, and status breakdown.
          </p>
        </div>

        {/* Refresh & Timestamp */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {lastUpdated && (
            <span className="text-xs text-slate-400 hidden sm:inline">
              Updated: <span className="font-mono text-slate-300">{lastUpdated}</span>
            </span>
          )}
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-medium transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 my-6">
        {/* Total Staff */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Staff</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white">{data.totalStaff}</span>
            <span className="text-xs text-slate-400 ml-1.5">Registered</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>{data.attendanceRate}% Present / Late</span>
          </div>
        </div>

        {/* Present (On Time) */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-medium">
            <span>Present (On-Time)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">{data.presentCount}</span>
            <span className="text-xs text-emerald-300/80 ml-1.5">Staff</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/80">
            {data.totalStaff > 0 ? Math.round((data.presentCount / data.totalStaff) * 100) : 0}% of roster
          </div>
        </div>

        {/* Late */}
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-amber-950/20">
          <div className="flex items-center justify-between text-amber-300 text-xs font-medium">
            <span>Late Check-Ins</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">{data.lateCount}</span>
            <span className="text-xs text-amber-300/80 ml-1.5">Staff</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400/80">
            Past scheduled start time
          </div>
        </div>

        {/* Absent */}
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg shadow-rose-950/20">
          <div className="flex items-center justify-between text-rose-300 text-xs font-medium">
            <span>Marked Absent</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">{data.absentCount}</span>
            <span className="text-xs text-rose-300/80 ml-1.5">Staff</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-400/80">
            Auto-marked via 09:00 AM cron
          </div>
        </div>

        {/* Pending */}
        <div className="col-span-2 lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pending / In-Transit</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-300">{data.pendingCount}</span>
            <span className="text-xs text-slate-400 ml-1.5">Awaiting</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            No check-in record yet
          </div>
        </div>
      </section>

      {/* Main Table Section */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search teacher by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs">
            {(
              [
                { key: 'all', label: 'All', count: data.totalStaff },
                { key: 'present', label: 'Present', count: data.presentCount },
                { key: 'late', label: 'Late', count: data.lateCount },
                { key: 'absent', label: 'Absent', count: data.absentCount },
                { key: 'pending', label: 'Pending', count: data.pendingCount },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.key ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-850 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3">Staff Name</th>
                <th className="pb-3 px-3">Shift Start</th>
                <th className="pb-3 px-3">Check-In Time</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-850/40 transition">
                    {/* Name */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{staff.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{staff.id.slice(0, 8)}...</div>
                    </td>

                    {/* Shift Start */}
                    <td className="py-3 px-3 text-slate-300 font-mono text-xs">
                      {staff.shiftStartTime || '08:00:00'}
                    </td>

                    {/* Check In Time */}
                    <td className="py-3 px-3 font-mono text-xs">
                      {staff.checkInTime ? (
                        <span className="text-slate-200">
                          {new Date(staff.checkInTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">--:--:--</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <StatusBadge status={staff.status} />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center text-xs text-slate-400 hover:text-emerald-400 cursor-pointer gap-1 transition">
                        View Log <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-400" />
                      <p className="text-sm font-medium">No staff members found matching this filter.</p>
                      <p className="text-xs text-slate-400">Try adjusting your search query or status filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: StaffAttendanceItem['status'] }) {
  switch (status) {
    case 'present':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Present
        </span>
      );
    case 'late':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Late
        </span>
      );
    case 'absent':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Absent
        </span>
      );
    case 'pending':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Pending
        </span>
      );
  }
}
