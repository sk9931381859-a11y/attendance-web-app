'use client';

import React, { useState, useEffect, useTransition } from 'react';
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
import { signOutAction } from '@/app/actions/auth';

interface TeacherRow {
  id: string;
  name: string;
  hash: string;
  shift: string;
  checkInTime: string;
  status: 'Pending' | 'Absent' | 'Present' | 'Late';
}

const MOCK_ROWS: TeacherRow[] = [
  {
    id: '1',
    name: 'Prof. Eleanor Vance',
    hash: '9933cb4...',
    shift: '08:00:00',
    checkInTime: '--:--:--',
    status: 'Pending',
  },
  {
    id: '2',
    name: 'School Principal (Admin)',
    hash: '2254077...',
    shift: '07:30:00',
    checkInTime: '02:30:00 PM',
    status: 'Absent',
  },
  {
    id: '3',
    name: 'Dr. Marcus Thorne',
    hash: '0000001...',
    shift: '08:00:00',
    checkInTime: '08:14:22 AM',
    status: 'Present',
  },
];

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'pending'>('all');
  const [currentTime, setCurrentTime] = useState('02:30:00 PM');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();

  // Set initial client time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    const now = new Date();
    setCurrentTime(
      now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    );
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleSignOut = () => {
    startLogout(async () => {
      await signOutAction();
    });
  };

  // Filter rows based on search and selected filter pill
  const filteredRows = MOCK_ROWS.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.hash.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedFilter === 'all') return matchesSearch;
    return matchesSearch && row.status.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR                                                     */}
      {/* ========================================================================= */}
      <nav className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm">
        {/* Left: Brand Logo + Text + Tiny ADMIN Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Building2 size={20} className="text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 tracking-tight">
                Attendance Hub
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                ADMIN
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-normal">
              Principal Administration & Oversight
            </p>
          </div>
        </div>

        {/* Center: Black Pill Navigation Toggle */}
        <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-full border border-gray-200">
          <button className="bg-black text-white rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-semibold shadow-sm">
            <BarChart2 size={16} />
            Live Monitoring
          </button>
          <Link
            href="/dashboard/manage"
            className="text-gray-600 hover:text-gray-900 px-4 py-1.5 rounded-full text-xs font-semibold transition"
          >
            Staff Directory
          </Link>
        </div>

        {/* Right: User Info + Black Sign Out Button */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-gray-900">
              School Principal (Admin)
            </div>
            <div className="text-[11px] text-gray-500 font-mono">
              addTrigat Tendance.app
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-semibold transition shadow-sm"
          >
            <LogOut size={14} />
            <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. PAGE HEADER                                                            */}
      {/* ========================================================================= */}
      <div className="mt-6 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Left: Title + Realtime Connected badge + Subtext */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Principal&apos;s Live Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Realtime Connected
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time daily attendance monitoring, anti-cheet logs, and status breakdown.
          </p>
        </div>

        {/* Right: Updated time + Black Refresh button */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs text-gray-500 font-mono">
            Updated: {currentTime}
          </span>
          <button
            onClick={handleRefresh}
            className="bg-black hover:bg-gray-800 text-white rounded-lg px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold transition shadow-sm"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. METRIC CARDS GRID (5 SPECIFIC CARDS)                                   */}
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
              3 Registered
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              ~ 33% Present / Late
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
              1 Staff
            </div>
            <p className="text-[11px] text-green-100 font-medium">
              33% of roster
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
              0 Staff
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
              1 Staff
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
              1 Awaiting
            </div>
            <p className="text-[11px] text-slate-700 font-medium">
              No check-in record yet
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DATA TABLE SECTION                                                     */}
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

            {/* Row of Black Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'all'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All (3)
              </button>
              <button
                onClick={() => setSelectedFilter('present')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'present'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Present (1)
              </button>
              <button
                onClick={() => setSelectedFilter('late')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'late'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Late (0)
              </button>
              <button
                onClick={() => setSelectedFilter('absent')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'absent'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Absent (1)
              </button>
              <button
                onClick={() => setSelectedFilter('pending')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  selectedFilter === 'pending'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending (1)
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
                        <button
                          type="button"
                          className="text-teal-600 hover:text-teal-700 font-medium text-xs hover:underline inline-flex items-center gap-0.5"
                        >
                          View Log ↗
                        </button>
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
