'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Users,
  Bell,
  Trash2,
  RefreshCw,
  Search,
  Check,
  X,
  GraduationCap,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Profile,
  LeaveRequest,
  SchoolNotice,
  OverdueChapter,
} from '@/types/supabase';

interface PacingDeviationWithStaff extends OverdueChapter {
  staffId: string;
  staffName: string;
  staffEmail?: string | null;
  staffDesignation?: string | null;
}

interface LeaveRequestWithStaff extends Omit<LeaveRequest, 'profiles'> {
  profiles?: {
    name: string;
    email?: string | null;
    designation?: string | null;
  } | null;
}

export default function AcademicOversight() {
  const [currentAdmin, setCurrentAdmin] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Column 1: Leave Approvals State
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequestWithStaff[]>([]);
  const [isUpdatingLeaveId, setIsUpdatingLeaveId] = useState<string | null>(null);

  // 2. Column 2: Pacing Deviations State
  const [deviations, setDeviations] = useState<PacingDeviationWithStaff[]>([]);
  const [isLoadingDeviations, setIsLoadingDeviations] = useState<boolean>(false);

  // 3. Column 3: Notice Publisher State
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [isUrgentPriority, setIsUrgentPriority] = useState(false);
  const [isPublishingNotice, setIsPublishingNotice] = useState(false);
  const [recentNotices, setRecentNotices] = useState<SchoolNotice[]>([]);

  // Load All Oversight Data
  const loadOversightData = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const supabase = createClient();

      // Resolve current admin profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        setCurrentAdmin(profile);
      }

      // 1. Fetch Pending Leave Requests
      const { data: leavesData, error: leavesErr } = await supabase
        .from('leave_requests')
        .select('*, profiles:staff_id(name, email, designation)')
        .eq('status', 'pending')
        .order('applied_at', { ascending: false });

      if (leavesErr) {
        console.error('Error loading pending leaves:', leavesErr);
      } else if (leavesData) {
        setPendingLeaves(leavesData as LeaveRequestWithStaff[]);
      }

      // 2. Fetch Recent Notices
      const { data: noticesData, error: noticeErr } = await supabase
        .from('school_notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (noticeErr) {
        console.error('Error loading notices:', noticeErr);
      } else if (noticesData) {
        setRecentNotices(noticesData);
      }

      // 3. Fetch Pacing Deviations for all Staff
      setIsLoadingDeviations(true);
      const { data: staffList, error: staffErr } = await supabase
        .from('profiles')
        .select('id, name, email, designation')
        .order('name', { ascending: true });

      if (!staffErr && staffList && staffList.length > 0) {
        const deviationResults = await Promise.all(
          staffList.map(async (staff) => {
            try {
              const { data: staffDevs, error: rpcErr } = await supabase.rpc(
                'get_pacing_deviations',
                { p_staff_id: staff.id }
              );

              if (!rpcErr && staffDevs && staffDevs.length > 0) {
                return staffDevs.map((d: OverdueChapter) => ({
                  ...d,
                  staffId: staff.id,
                  staffName: staff.name,
                  staffEmail: staff.email,
                  staffDesignation: staff.designation,
                }));
              }
            } catch (err) {
              console.warn(`RPC error evaluating staff ${staff.name}:`, err);
            }
            return [];
          })
        );

        setDeviations(deviationResults.flat());
      }
    } catch (err: unknown) {
      console.error('Error loading Academic Oversight data:', err);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'An unexpected error occurred while loading oversight data.',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingDeviations(false);
    }
  }, []);

  useEffect(() => {
    loadOversightData();
  }, [loadOversightData]);

  // Action: Approve or Reject Leave Request
  const handleUpdateLeaveStatus = async (
    leaveId: string,
    newStatus: 'approved' | 'rejected'
  ) => {
    setIsUpdatingLeaveId(leaveId);
    setFeedback(null);

    // Optimistic UI update
    const targetLeave = pendingLeaves.find((l) => l.id === leaveId);
    setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: newStatus })
        .eq('id', leaveId);

      if (error) throw error;

      setFeedback({
        type: 'success',
        text: `Leave request for ${targetLeave?.profiles?.name || 'teacher'} was marked as ${newStatus}.`,
      });
    } catch (err: unknown) {
      console.error('Failed to update leave request:', err);
      // Rollback optimistic update
      if (targetLeave) {
        setPendingLeaves((prev) => [targetLeave, ...prev]);
      }
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update leave status.',
      });
    } finally {
      setIsUpdatingLeaveId(null);
    }
  };

  // Action: Publish New School Notice
  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      setFeedback({ type: 'error', text: 'Please fill in both title and content.' });
      return;
    }

    setIsPublishingNotice(true);
    setFeedback(null);

    try {
      const supabase = createClient();
      const payload = {
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        priority: isUrgentPriority ? 'urgent' : 'normal',
        created_by: currentAdmin?.id || null,
      };

      const { data, error } = await supabase
        .from('school_notices')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setRecentNotices((prev) => [data, ...prev]);
      setNoticeTitle('');
      setNoticeContent('');
      setIsUrgentPriority(false);

      setFeedback({
        type: 'success',
        text: 'Announcement broadcasted successfully to all faculty portals.',
      });
    } catch (err: unknown) {
      console.error('Error publishing notice:', err);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to publish announcement.',
      });
    } finally {
      setIsPublishingNotice(false);
    }
  };

  // Action: Delete Published Notice
  const handleDeleteNotice = async (noticeId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('school_notices')
        .delete()
        .eq('id', noticeId);

      if (error) throw error;

      setRecentNotices((prev) => prev.filter((n) => n.id !== noticeId));
      setFeedback({
        type: 'success',
        text: 'Notice removed from broadcast board.',
      });
    } catch (err) {
      console.error('Failed to delete notice:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ===================================================================== */}
      {/* HEADER SECTION                                                        */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                  Academic & Faculty Oversight
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                  Principal Desk
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time leave authorization, syllabus deviation monitoring, and institutional broadcasting
              </p>
            </div>
          </div>
        </div>

        {/* Reload Data Button */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={loadOversightData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-sm transition disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Desk</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 border shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Pending Leave Requests</span>
            <CalendarDays className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-gray-900">
              {pendingLeaves.length}
            </span>
            <span className="text-xs text-gray-500">Awaiting Authorization</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Syllabus Pacing Deviations</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono ${deviations.length > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
              {deviations.length}
            </span>
            <span className="text-xs text-gray-500">Overdue Chapters</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Active Broadcast Notices</span>
            <Bell className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-gray-900">
              {recentNotices.length}
            </span>
            <span className="text-xs text-gray-500">Issued Circulars</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3-COLUMN OVERSIGHT DASHBOARD GRID                                     */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ------------------------------------------------------------------- */}
        {/* COLUMN 1: LEAVE APPROVALS                                           */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-gray-900">Leave Approvals</h2>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              {pendingLeaves.length} Pending
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-teal-600" />
              Loading leave applications...
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
              <p className="text-xs font-semibold text-gray-700">All Clear</p>
              <p className="text-[11px] text-gray-400">
                Zero pending faculty leave applications to review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((req) => (
                <div
                  key={req.id}
                  className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-3 hover:border-gray-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {req.profiles?.name || 'Faculty Member'}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium">
                        {req.profiles?.designation || 'Teacher'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {req.leave_type}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1 bg-white p-2.5 rounded-lg border border-gray-200/60 font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Duration:</span>
                      <span className="font-semibold text-gray-800">
                        {req.start_date} → {req.end_date}
                      </span>
                    </div>
                    {req.reason && (
                      <p className="text-[11px] text-gray-600 font-sans pt-1 border-t border-gray-100 italic">
                        &quot;{req.reason}&quot;
                      </p>
                    )}
                  </div>

                  {/* Approve / Reject Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isUpdatingLeaveId === req.id}
                      onClick={() => handleUpdateLeaveStatus(req.id, 'approved')}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingLeaveId === req.id}
                      onClick={() => handleUpdateLeaveStatus(req.id, 'rejected')}
                      className="flex-1 py-1.5 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-semibold transition shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* COLUMN 2: PACING DEVIATIONS (SOFT RED ALERT UI)                     */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-gray-900">Pacing Deviations</h2>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                deviations.length > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              {deviations.length} Delayed
            </span>
          </div>

          {isLoadingDeviations ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-teal-600" />
              Evaluating teacher syllabus pacing...
            </div>
          ) : deviations.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
              <p className="text-xs font-semibold text-gray-700">On Track</p>
              <p className="text-[11px] text-gray-400">
                All classes are on schedule. Zero pacing deviations recorded.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deviations.map((dev, idx) => (
                <div
                  key={`${dev.chapter_id}-${dev.staffId}-${idx}`}
                  className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-rose-950">
                        {dev.staffName}
                      </h4>
                      <p className="text-[11px] text-rose-800 font-medium">
                        {dev.subject_name} • {dev.grade} ({dev.section})
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-900 border border-rose-300">
                      {dev.days_delayed}d Overdue
                    </span>
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-lg border border-rose-200 text-xs space-y-1 font-mono">
                    <div className="font-semibold text-rose-950 font-sans">
                      CH #{dev.chapter_number}: {dev.chapter_title}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-rose-800">
                      <span>Target Date: {dev.target_completion_date}</span>
                      <span className="text-rose-700 font-bold">Not Locked</span>
                    </div>
                  </div>

                  {/* Milestone status indicator */}
                  <div className="flex items-center gap-1.5 text-[10px] text-rose-800 pt-1 font-sans">
                    <span
                      className={`px-1.5 py-0.5 rounded border ${
                        dev.theory_completed
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-700 border-rose-300'
                      }`}
                    >
                      Theory: {dev.theory_completed ? 'Done' : 'Pending'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border ${
                        dev.qa_completed
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-700 border-rose-300'
                      }`}
                    >
                      Q&A: {dev.qa_completed ? 'Done' : 'Pending'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border ${
                        dev.notebooks_checked
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-700 border-rose-300'
                      }`}
                    >
                      Notebooks: {dev.notebooks_checked ? 'Done' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* COLUMN 3: NOTICE PUBLISHER                                          */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-gray-900">Broadcast Notice</h2>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              Publish to Faculty
            </span>
          </div>

          {/* Broadcast Form */}
          <form onSubmit={handlePublishNotice} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notice Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Staff Meeting & Exam Submission..."
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Announcement Content
              </label>
              <textarea
                rows={3}
                required
                placeholder="Type circular details or instructions for faculty members..."
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isUrgentPriority}
                  onChange={(e) => setIsUrgentPriority(e.target.checked)}
                  className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                />
                <span className={isUrgentPriority ? 'text-rose-700 font-bold' : ''}>
                  Mark as Urgent Priority
                </span>
              </label>

              <button
                type="submit"
                disabled={isPublishingNotice}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isPublishingNotice ? 'Publishing...' : 'Broadcast'}</span>
              </button>
            </div>
          </form>

          {/* Recently Published Notices List */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Recent Announcements
            </h3>

            {recentNotices.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">
                No announcements published yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {recentNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="p-3 bg-gray-50/70 border border-gray-200 rounded-xl space-y-1.5 group hover:border-gray-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-bold text-gray-900">
                        {notice.title}
                      </h5>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                            notice.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-gray-200 text-gray-700 border-gray-300'
                          }`}
                        >
                          {notice.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotice(notice.id)}
                          title="Delete notice"
                          className="text-gray-400 hover:text-rose-600 p-0.5 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2">
                      {notice.content}
                    </p>
                    <div className="text-[10px] text-gray-400 font-mono pt-1">
                      {notice.created_at
                        ? new Date(notice.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
