'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bell,
  Lock,
  CalendarDays,
  FileText,
  Send,
  Users,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Profile,
  AcademicClass,
  AcademicSubject,
  TeacherAllocation,
  Chapter,
  ChapterProgress,
  LeaveRequest,
  SchoolNotice,
  TimetableEntry,
  OverdueChapter,
} from '@/types/supabase';

type TabType = 'overview' | 'academics' | 'leave' | 'notices';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
];

const PERIOD_TIMES: Record<number, string> = {
  1: '08:00 - 08:45 AM',
  2: '08:45 - 09:30 AM',
  3: '09:45 - 10:30 AM',
  4: '10:30 - 11:15 AM',
  5: '11:45 - 12:30 PM',
  6: '12:30 - 01:15 PM',
  7: '01:30 - 02:15 PM',
  8: '02:15 - 03:00 PM',
};

export default function FacultyDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [currentStaff, setCurrentStaff] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 1: Overview Data
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 || d === 7 ? 1 : d;
  });
  const [overdueChapters, setOverdueChapters] = useState<OverdueChapter[]>([]);

  // Tab 2: Academics / Syllabus Data
  const [allocations, setAllocations] = useState<TeacherAllocation[]>([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ChapterProgress>>({});
  const [isSavingProgress, setIsSavingProgress] = useState<boolean>(false);

  // Tab 3: Leave Portal Data
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Tab 4: Notice Board Filter
  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticePriorityFilter, setNoticePriorityFilter] = useState<'all' | 'urgent' | 'high' | 'normal' | 'low'>('all');

  // Load User & Core Data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // 1. Resolve logged-in faculty user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let staffProfile: Profile | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        staffProfile = profile;
      }

      // Fallback to first profile if not logged in (preview mode)
      if (!staffProfile) {
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);
        if (fallbackProfiles && fallbackProfiles.length > 0) {
          staffProfile = fallbackProfiles[0];
        }
      }

      setCurrentStaff(staffProfile);
      const staffId = staffProfile?.id;

      if (!staffId) {
        setIsLoading(false);
        return;
      }

      // 2. Fetch notices scoped to this school
      let noticeQuery = supabase
        .from('school_notices')
        .select('*, profiles:created_by(name, designation)');

      if (staffProfile?.school_id) {
        noticeQuery = noticeQuery.eq('school_id', staffProfile.school_id);
      }

      const { data: noticeData } = await noticeQuery
        .order('created_at', { ascending: false });
      if (noticeData) setNotices(noticeData);

      // 3. Fetch timetables for this staff member
      const { data: ttData } = await supabase
        .from('timetables')
        .select('*, academic_classes(id, grade, section), academic_subjects(id, name)')
        .eq('staff_id', staffId)
        .order('period_number', { ascending: true });
      if (ttData) setTimetables(ttData);

      // 4. Fetch teacher allocations (Classes & Subjects)
      const { data: allocData } = await supabase
        .from('teacher_allocations')
        .select('*, academic_classes(id, grade, section), academic_subjects(id, name)')
        .eq('staff_id', staffId);

      if (allocData && allocData.length > 0) {
        setAllocations(allocData);
        setSelectedAllocationId(allocData[0].id);
      }

      // 5. Fetch Pacing Deviations (RPC)
      try {
        const { data: devData } = await supabase.rpc('get_pacing_deviations', {
          p_staff_id: staffId,
        });
        if (devData) setOverdueChapters(devData);
      } catch (rpcErr) {
        console.warn('RPC get_pacing_deviations call warning:', rpcErr);
      }

      // 6. Fetch Leave History
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('staff_id', staffId)
        .order('applied_at', { ascending: false });
      if (leaveData) setLeaveRequests(leaveData);
    } catch (err: unknown) {
      console.error('Error loading Faculty Dashboard data:', err);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load faculty information.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load Chapters & Progress when selected allocation changes
  const loadAllocationChapters = useCallback(async () => {
    if (!selectedAllocationId || !currentStaff) return;
    const alloc = allocations.find((a) => a.id === selectedAllocationId);
    if (!alloc) return;

    try {
      const supabase = createClient();

      // Fetch chapters for selected class & subject
      const { data: chapterList } = await supabase
        .from('chapters')
        .select('*')
        .eq('class_id', alloc.class_id)
        .eq('subject_id', alloc.subject_id)
        .order('chapter_number', { ascending: true });

      if (!chapterList || chapterList.length === 0) {
        setChapters([]);
        setProgressMap({});
        return;
      }

      setChapters(chapterList);

      // Fetch existing chapter_progress records for this teacher
      const chapterIds = chapterList.map((c) => c.id);
      const { data: progressRecords } = await supabase
        .from('chapter_progress')
        .select('*')
        .eq('staff_id', currentStaff.id)
        .in('chapter_id', chapterIds);

      const map: Record<string, ChapterProgress> = {};
      (progressRecords || []).forEach((rec) => {
        map[rec.chapter_id] = rec;
      });

      setProgressMap(map);
    } catch (err) {
      console.error('Error loading chapters for allocation:', err);
    }
  }, [selectedAllocationId, allocations, currentStaff]);

  useEffect(() => {
    loadAllocationChapters();
  }, [loadAllocationChapters]);

  // Handle toggle updates for chapter progress
  const handleToggleMilestone = async (
    chapterId: string,
    field: 'theory_completed' | 'qa_completed' | 'notebooks_checked',
    currentVal: boolean
  ) => {
    if (!currentStaff) return;
    const existing = progressMap[chapterId];
    if (existing?.is_locked) return; // Prevent edits if locked

    const updated = {
      chapter_id: chapterId,
      staff_id: currentStaff.id,
      theory_completed: existing?.theory_completed ?? false,
      qa_completed: existing?.qa_completed ?? false,
      notebooks_checked: existing?.notebooks_checked ?? false,
      is_locked: false,
      target_completion_date: existing?.target_completion_date ?? null,
      [field]: !currentVal,
    };

    // Optimistic UI update
    setProgressMap((prev) => ({
      ...prev,
      [chapterId]: {
        ...(prev[chapterId] || {}),
        ...updated,
      } as ChapterProgress,
    }));

    try {
      const supabase = createClient();
      await supabase
        .from('chapter_progress')
        .upsert(updated, { onConflict: 'chapter_id,staff_id' });
    } catch (err) {
      console.error('Failed to update progress milestone:', err);
    }
  };

  // Handle target completion date update
  const handleTargetDateChange = async (chapterId: string, targetDate: string) => {
    if (!currentStaff) return;
    const existing = progressMap[chapterId];
    if (existing?.is_locked) return;

    const updated = {
      chapter_id: chapterId,
      staff_id: currentStaff.id,
      theory_completed: existing?.theory_completed ?? false,
      qa_completed: existing?.qa_completed ?? false,
      notebooks_checked: existing?.notebooks_checked ?? false,
      is_locked: false,
      target_completion_date: targetDate || null,
    };

    setProgressMap((prev) => ({
      ...prev,
      [chapterId]: {
        ...(prev[chapterId] || {}),
        ...updated,
      } as ChapterProgress,
    }));

    try {
      const supabase = createClient();
      await supabase
        .from('chapter_progress')
        .upsert(updated, { onConflict: 'chapter_id,staff_id' });
    } catch (err) {
      console.error('Failed to update target completion date:', err);
    }
  };

  // Lock Chapter logic: ONLY enabled when all 3 toggles are TRUE
  const handleLockChapter = async (chapterId: string) => {
    if (!currentStaff) return;
    const existing = progressMap[chapterId];
    if (!existing) return;

    const canLock =
      existing.theory_completed &&
      existing.qa_completed &&
      existing.notebooks_checked;

    if (!canLock) {
      setFeedback({
        type: 'error',
        text: 'All 3 milestones (Theory, Q&A, and Notebook Checking) must be completed before locking.',
      });
      return;
    }

    setIsSavingProgress(true);
    const lockPayload = {
      chapter_id: chapterId,
      staff_id: currentStaff.id,
      theory_completed: true,
      qa_completed: true,
      notebooks_checked: true,
      is_locked: true,
      target_completion_date: existing.target_completion_date ?? null,
      locked_at: new Date().toISOString(),
    };

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('chapter_progress')
        .upsert(lockPayload, { onConflict: 'chapter_id,staff_id' });

      if (error) throw error;

      setProgressMap((prev) => ({
        ...prev,
        [chapterId]: {
          ...(prev[chapterId] || {}),
          ...lockPayload,
        } as ChapterProgress,
      }));

      setFeedback({
        type: 'success',
        text: 'Chapter syllabus milestones have been permanently locked and certified.',
      });

      // Refresh overdue pacing deviations
      const { data: devData } = await supabase.rpc('get_pacing_deviations', {
        p_staff_id: currentStaff.id,
      });
      if (devData) setOverdueChapters(devData);
    } catch (err: unknown) {
      console.error('Error locking chapter progress:', err);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to lock chapter.',
      });
    } finally {
      setIsSavingProgress(false);
    }
  };

  // Handle Leave Application Submission
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff) return;
    if (!leaveStartDate || !leaveEndDate) {
      setFeedback({ type: 'error', text: 'Please select both start and end dates.' });
      return;
    }

    setIsSubmittingLeave(true);
    setFeedback(null);

    try {
      const supabase = createClient();
      const newLeave = {
        staff_id: currentStaff.id,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        leave_type: leaveType,
        reason: leaveReason.trim() || null,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('leave_requests')
        .insert([newLeave])
        .select()
        .single();

      if (error) throw error;

      setLeaveRequests((prev) => [data, ...prev]);
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
      setFeedback({
        type: 'success',
        text: 'Leave application submitted successfully for administrator approval.',
      });
    } catch (err: unknown) {
      console.error('Error submitting leave request:', err);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit leave request.',
      });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Filtered Today's Timetables for selected day
  const dayTimetables = useMemo(() => {
    return timetables.filter((t) => t.day_of_week === selectedDayOfWeek);
  }, [timetables, selectedDayOfWeek]);

  // Latest High Priority Notice for Banner
  const urgentNotice = useMemo(() => {
    return notices.find((n) => n.priority === 'urgent' || n.priority === 'high');
  }, [notices]);

  // Filtered Notices for Notice Board Tab
  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(noticeSearch.toLowerCase()) ||
        n.content.toLowerCase().includes(noticeSearch.toLowerCase());
      const matchesPriority =
        noticePriorityFilter === 'all' || n.priority === noticePriorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [notices, noticeSearch, noticePriorityFilter]);

  const activeAllocation = useMemo(() => {
    return allocations.find((a) => a.id === selectedAllocationId);
  }, [allocations, selectedAllocationId]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & TEACHER PROFILE                                       */}
      {/* ===================================================================== */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                Faculty Hub
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                Teacher Portal
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Welcome back, {currentStaff?.name || 'Faculty Member'} •{' '}
              {currentStaff?.designation || 'Faculty Member'}
            </p>
          </div>
        </div>

        {/* Top Segmented Navigation Tabs (Progressive Disclosure) */}
        <nav className="inline-flex items-center gap-1 bg-gray-200/70 p-1 rounded-full border border-gray-200 overflow-x-auto max-w-full">
          {(
            [
              { id: 'overview', label: "Today's Overview", icon: Clock },
              { id: 'academics', label: 'Academics & Syllabus', icon: BookOpen },
              { id: 'leave', label: 'Leave Portal', icon: CalendarDays },
              { id: 'notices', label: 'Notice Board', icon: Bell },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Feedback Banner */}
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

      {/* ===================================================================== */}
      {/* TAB 1: TODAY'S OVERVIEW                                               */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* High Priority Notice Banner */}
          {urgentNotice && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-900 tracking-tight">
                      {urgentNotice.title}
                    </span>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                      {urgentNotice.priority}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 mt-1 line-clamp-2">
                    {urgentNotice.content}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('notices')}
                className="text-xs font-semibold text-amber-900 hover:text-black self-end sm:self-center flex items-center gap-1 flex-shrink-0"
              >
                View Notice Board <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Overdue Syllabus Deviations Alert (Lazy Evaluation) */}
          {overdueChapters.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-rose-900 tracking-tight">
                    Syllabus Pacing Deviation Warning
                  </h3>
                  <p className="text-xs text-rose-800/90 mt-0.5">
                    You have <strong>{overdueChapters.length}</strong> chapter(s) past their target
                    completion date requiring immediate syllabus certification.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('academics')}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-sm transition self-end sm:self-center flex-shrink-0"
              >
                Update Syllabus
              </button>
            </div>
          )}

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                <span>Today&apos;s Classes</span>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold font-mono text-gray-900">
                  {dayTimetables.length}
                </span>
                <span className="text-xs text-gray-500 ml-2">Periods Scheduled</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                <span>Allocated Batches</span>
                <BookOpen className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold font-mono text-gray-900">
                  {allocations.length}
                </span>
                <span className="text-xs text-gray-500 ml-2">Class Subjects</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                <span>Pending Leave Requests</span>
                <CalendarDays className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold font-mono text-gray-900">
                  {leaveRequests.filter((l) => l.status === 'pending').length}
                </span>
                <span className="text-xs text-gray-500 ml-2">Awaiting Approval</span>
              </div>
            </div>
          </div>

          {/* Timetable Card Row */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Today&apos;s Teaching Schedule</h2>
                <p className="text-xs text-gray-500">
                  Day-by-day timetable assignments and classroom periods
                </p>
              </div>

              {/* Day Selector Pills */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 overflow-x-auto">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDayOfWeek(d.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedDayOfWeek === d.id
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal Scrollable Periods Grid */}
            {dayTimetables.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs">No teaching periods scheduled for this day.</p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3 pt-1">
                {dayTimetables.map((item) => (
                  <div
                    key={item.id}
                    className="min-w-[220px] sm:min-w-[250px] bg-gray-50/70 border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-gray-300 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          Period {item.period_number}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          {PERIOD_TIMES[item.period_number] || 'Standard Period'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">
                        {item.academic_subjects?.name || 'Subject'}
                      </h4>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {item.academic_classes
                          ? `${item.academic_classes.grade} • Sec ${item.academic_classes.section}`
                          : 'Classroom'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                      <span>Standard Room</span>
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <Check className="w-3 h-3 text-emerald-600" /> Confirmed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ACADEMICS (SYLLABUS TRACKER)                                   */}
      {/* ===================================================================== */}
      {activeTab === 'academics' && (
        <div className="space-y-6">
          {/* Class & Subject Selector Header */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Assigned Classes & Subjects</h2>
              <p className="text-xs text-gray-500">
                Select a class allocation to manage chapters, milestone progress, and syllabus locking.
              </p>
            </div>

            {allocations.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                No teaching allocations found for your profile. Please contact the administrator.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {allocations.map((alloc) => {
                  const isSelected = selectedAllocationId === alloc.id;
                  return (
                    <button
                      key={alloc.id}
                      onClick={() => setSelectedAllocationId(alloc.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition border flex items-center gap-2 ${
                        isSelected
                          ? 'bg-black text-white border-black shadow-sm'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>
                        {alloc.academic_classes?.grade} - {alloc.academic_classes?.section} •{' '}
                        {alloc.academic_subjects?.name}
                      </span>
                      {alloc.is_class_teacher && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900">
                          Class Teacher
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chapters List & Granular Toggles */}
          {activeAllocation && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Curriculum Progress:{' '}
                    <span className="text-teal-700">
                      {activeAllocation.academic_classes?.grade} -{' '}
                      {activeAllocation.academic_classes?.section} (
                      {activeAllocation.academic_subjects?.name})
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Mark milestones. Once all 3 milestones are complete, lock the chapter permanently.
                  </p>
                </div>
                <div className="text-xs font-medium text-gray-500">
                  {chapters.length} Chapters Total
                </div>
              </div>

              {chapters.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <p className="text-xs">No syllabus chapters uploaded for this subject yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chapters.map((chapter) => {
                    const prog = progressMap[chapter.id] || {
                      chapter_id: chapter.id,
                      staff_id: currentStaff?.id || '',
                      theory_completed: false,
                      qa_completed: false,
                      notebooks_checked: false,
                      is_locked: false,
                      target_completion_date: null,
                    };

                    const isLocked = prog.is_locked;
                    const allCompleted =
                      prog.theory_completed &&
                      prog.qa_completed &&
                      prog.notebooks_checked;

                    return (
                      <div
                        key={chapter.id}
                        className={`border rounded-xl p-4 transition ${
                          isLocked
                            ? 'bg-gray-50/60 border-emerald-200/80 shadow-none'
                            : 'bg-white border-gray-200 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          {/* Chapter Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-400 font-mono">
                                CH #{chapter.chapter_number}
                              </span>
                              <h4 className="text-sm font-bold text-gray-900">
                                {chapter.title}
                              </h4>
                              {isLocked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Lock className="w-3 h-3 text-emerald-600" /> Locked & Certified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                  In Progress
                                </span>
                              )}
                            </div>

                            {/* Target Date Picker (Lazy Analytics) */}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>Target Completion Date:</span>
                              <input
                                type="date"
                                disabled={isLocked}
                                value={prog.target_completion_date || ''}
                                onChange={(e) =>
                                  handleTargetDateChange(chapter.id, e.target.value)
                                }
                                className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
                              />
                              {prog.target_completion_date &&
                                new Date(prog.target_completion_date) < new Date() &&
                                !isLocked && (
                                  <span className="text-[11px] text-rose-600 font-semibold">
                                    Overdue
                                  </span>
                                )}
                            </div>
                          </div>

                          {/* 3 Milestones Toggles */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {/* Toggle 1: Theory Explained */}
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() =>
                                handleToggleMilestone(
                                  chapter.id,
                                  'theory_completed',
                                  prog.theory_completed
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                                prog.theory_completed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                              } ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                                  prog.theory_completed ? 'bg-emerald-600 text-white' : 'border border-gray-300'
                                }`}
                              >
                                {prog.theory_completed && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <span>Theory Explained</span>
                            </button>

                            {/* Toggle 2: Q&A Done */}
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() =>
                                handleToggleMilestone(
                                  chapter.id,
                                  'qa_completed',
                                  prog.qa_completed
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                                prog.qa_completed
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                              } ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                                  prog.qa_completed ? 'bg-emerald-600 text-white' : 'border border-gray-300'
                                }`}
                              >
                                {prog.qa_completed && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <span>Q&A Done</span>
                            </button>

                            {/* Toggle 3: Notebooks Checked */}
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() =>
                                handleToggleMilestone(
                                  chapter.id,
                                  'notebooks_checked',
                                  prog.notebooks_checked
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                                prog.notebooks_checked
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                              } ${isLocked ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                                  prog.notebooks_checked ? 'bg-emerald-600 text-white' : 'border border-gray-300'
                                }`}
                              >
                                {prog.notebooks_checked && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <span>Notebooks Checked</span>
                            </button>

                            {/* Lock Chapter Button */}
                            <button
                              type="button"
                              disabled={!allCompleted || isLocked || isSavingProgress}
                              onClick={() => handleLockChapter(chapter.id)}
                              title={
                                !allCompleted
                                  ? 'Complete all 3 milestones above to lock'
                                  : 'Lock Chapter'
                              }
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm ${
                                isLocked
                                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                  : allCompleted
                                  ? 'bg-gray-900 hover:bg-black text-white cursor-pointer active:scale-95'
                                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                              }`}
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>{isLocked ? 'Locked' : 'Lock Chapter'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: LEAVE PORTAL                                                   */}
      {/* ===================================================================== */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          {/* Leave Application Form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-900">Apply for Leave</h2>
              <p className="text-xs text-gray-500">
                Submit a formal leave application for administrative review and roster adjustment.
              </p>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-gray-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-gray-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-gray-400 transition"
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Duty Leave">Duty Leave</option>
                    <option value="Maternity / Paternity">Maternity / Paternity</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Absence
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify circumstances or reason for leave..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingLeave ? 'Submitting...' : 'Submit Application'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Leave History Table */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Leave Applications History</h3>
              <p className="text-xs text-gray-500">
                Audit trail of submitted leave requests and administrative determinations
              </p>
            </div>

            {leaveRequests.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">
                No leave requests filed yet.
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 text-[11px] font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Applied Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {req.leave_type}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-mono text-[11px]">
                          {req.start_date} to {req.end_date}
                        </td>
                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                          {req.reason || '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                          {req.applied_at
                            ? new Date(req.applied_at).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {req.status === 'approved' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Approved
                            </span>
                          ) : req.status === 'rejected' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: NOTICE BOARD                                                   */}
      {/* ===================================================================== */}
      {activeTab === 'notices' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Institutional Notice Board</h2>
              <p className="text-xs text-gray-500">
                Official announcements, faculty circulars, and executive memos
              </p>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search notices..."
                  value={noticeSearch}
                  onChange={(e) => setNoticeSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition"
                />
              </div>

              <select
                value={noticePriorityFilter}
                onChange={(e) =>
                  setNoticePriorityFilter(e.target.value as typeof noticePriorityFilter)
                }
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-gray-400 transition"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Notices List */}
          {filteredNotices.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No school notices found matching criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  className={`border rounded-xl p-4 transition ${
                    notice.priority === 'urgent'
                      ? 'bg-rose-50/40 border-rose-200'
                      : notice.priority === 'high'
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-gray-50/50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{notice.title}</h4>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            notice.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : notice.priority === 'high'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {notice.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {notice.content}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                    <span>
                      Issued: {new Date(notice.created_at || '').toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>Institutional Administration</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
