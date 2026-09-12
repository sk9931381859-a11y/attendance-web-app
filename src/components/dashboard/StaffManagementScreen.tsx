'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
  Users,
  UserPlus,
  Clock,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
  Sparkles,
  History,
  DollarSign,
  Briefcase,
  KeyRound,
  Copy,
  Check,
  Filter,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  StaffMember,
  AttendanceLogRecord,
  registerStaffAction,
  updateStaffAction,
  deleteStaffAction,
  getAttendanceLogsAction,
} from '@/app/actions/staff';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface StaffManagementScreenProps {
  initialStaff: StaffMember[];
  initialLogs: AttendanceLogRecord[];
}

export default function StaffManagementScreen({
  initialStaff,
  initialLogs,
}: StaffManagementScreenProps) {
  // Navigation Active Tab
  const [activeTab, setActiveTab] = useState<'roster' | 'register' | 'logs'>('roster');

  // Staff State
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'admin'>('all');

  // Modal / Edit States
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editShift, setEditShift] = useState('08:00:00');
  const [editRole, setEditRole] = useState<'staff' | 'admin'>('staff');
  const [editSalary, setEditSalary] = useState('');
  const [editWorkingDays, setEditWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [editError, setEditError] = useState<string | null>(null);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regShift, setRegShift] = useState('08:00:00');
  const [regSalary, setRegSalary] = useState('');
  const [regRole, setRegRole] = useState<'staff' | 'admin'>('staff');
  const [regWorkingDays, setRegWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<{
    staff: StaffMember;
    password?: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Attendance Logs State
  const [logsList, setLogsList] = useState<AttendanceLogRecord[]>(initialLogs);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all');

  // Default date filter: 3 months ago until today
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  }, []);

  const defaultEndDate = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [isFilteringLogs, setIsFilteringLogs] = useState(false);
  const [logFilterMessage, setLogFilterMessage] = useState<string | null>(null);

  // Global feedback message
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Helper: show feedback notification
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setGlobalMessage({ type, text });
    setTimeout(() => setGlobalMessage(null), 4000);
  };

  // Filtered staff list for Roster tab
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.designation && s.designation.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, roleFilter]);

  // Filtered attendance logs
  const filteredLogs = useMemo(() => {
    return logsList.filter((log) => {
      const teacherName = log.profiles?.name || '';
      const designation = log.profiles?.designation || '';
      const matchesSearch =
        teacherName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        designation.toLowerCase().includes(logSearchQuery.toLowerCase());
      const matchesStatus = logStatusFilter === 'all' || log.status === logStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [logsList, logSearchQuery, logStatusFilter]);

  // Log Summary Stats
  const logStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    logsList.forEach((l) => {
      if (l.status === 'present') present++;
      else if (l.status === 'late') late++;
      else if (l.status === 'absent') absent++;
    });
    return { total: logsList.length, present, late, absent };
  }, [logsList]);

  // Toggle working day checkbox
  const toggleWorkingDay = (
    day: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (current.includes(day)) {
      if (current.length === 1) return; // Must have at least 1 day
      setter(current.filter((d) => d !== day));
    } else {
      setter([...current, day]);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditDesignation(staff.designation || '');
    setEditShift(staff.shift_start_time || '08:00:00');
    setEditRole(staff.role);
    setEditSalary(staff.salary != null ? String(staff.salary) : '');
    setEditWorkingDays(
      staff.working_days && staff.working_days.length > 0
        ? staff.working_days
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    );
    setEditError(null);
  };

  // Submit Edit Staff
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!editName.trim()) {
      setEditError('Staff name is required.');
      return;
    }

    setEditError(null);
    startTransition(async () => {
      const res = await updateStaffAction({
        id: editingStaff.id,
        name: editName.trim(),
        shift_start_time: editShift,
        role: editRole,
        designation: editDesignation.trim() || null,
        salary: editSalary ? Number(editSalary) : null,
        working_days: editWorkingDays,
      });

      if (!res.success || !res.staff) {
        setEditError(res.error || 'Failed to update staff member.');
        return;
      }

      setStaffList((prev) =>
        prev
          .map((s) => (s.id === res.staff!.id ? res.staff! : s))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingStaff(null);
      showFeedback('success', `Updated profile for "${res.staff.name}".`);
    });
  };

  // Confirm Delete Staff
  const handleDeleteConfirm = () => {
    if (!deletingStaff) return;

    startTransition(async () => {
      const res = await deleteStaffAction(deletingStaff.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete staff member.');
        setDeletingStaff(null);
        return;
      }

      setStaffList((prev) => prev.filter((s) => s.id !== deletingStaff.id));
      showFeedback('success', `Staff member "${deletingStaff.name}" has been removed.`);
      setDeletingStaff(null);
    });
  };

  // Submit Registration Form
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim() || regName.trim().length < 2) {
      setRegError('Staff full name (minimum 2 characters) is required.');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('A valid email address is required.');
      return;
    }

    startTransition(async () => {
      const res = await registerStaffAction({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim() || undefined,
        designation: regDesignation.trim() || undefined,
        shift_start_time: regShift,
        salary: regSalary ? Number(regSalary) : undefined,
        working_days: regWorkingDays,
        role: regRole,
      });

      if (!res.success || !res.staff) {
        setRegError(res.error || 'Failed to register staff account.');
        return;
      }

      // Append new staff to list
      setStaffList((prev) => [...prev, res.staff!].sort((a, b) => a.name.localeCompare(b.name)));

      // Show success credentials card
      setRegSuccess({
        staff: res.staff,
        password: res.generatedPassword || regPassword,
      });

      // Clear form
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegDesignation('');
      setRegShift('08:00:00');
      setRegSalary('');
      setRegWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    });
  };

  // Copy temporary credentials
  const copyCredentials = () => {
    if (!regSuccess) return;
    const text = `Attendance App Account:\nEmail: ${regSuccess.staff.email}\nTemporary Password: ${regSuccess.password}`;
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  // Fetch Attendance Logs with Custom Date Range
  const handleFilterLogs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsFilteringLogs(true);
    setLogFilterMessage(null);

    const res = await getAttendanceLogsAction({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    setIsFilteringLogs(false);
    if (!res.success) {
      setLogFilterMessage(res.error || 'Failed to fetch logs for selected range.');
      return;
    }

    setLogsList(res.logs || []);
    setLogFilterMessage(`Loaded ${res.logs?.length || 0} records for range: ${startDate} to ${endDate}.`);
    setTimeout(() => setLogFilterMessage(null), 4000);
  };

  // Reset to Default (3 months)
  const handleResetLogRange = async () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setIsFilteringLogs(true);

    const res = await getAttendanceLogsAction();
    setIsFilteringLogs(false);

    if (res.success) {
      setLogsList(res.logs || []);
      setLogFilterMessage('Reset range to standard 3-month window.');
      setTimeout(() => setLogFilterMessage(null), 3500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Administrative Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Staff & Attendance Hub
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono font-medium">
              {staffList.length} Staff Members
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Provision staff credentials via Supabase Auth without session interruption, configure shift schedules, and audit historical attendance check-ins.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          {activeTab !== 'register' ? (
            <button
              onClick={() => setActiveTab('register')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Register New Staff
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('roster')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
            >
              <Users className="w-4 h-4" />
              View Staff Roster
            </button>
          )}
        </div>
      </div>

      {/* Global Toast / Feedback */}
      {globalMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs flex items-center gap-3 shadow-lg border transition ${
            globalMessage.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
          }`}
        >
          {globalMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{globalMessage.text}</span>
        </div>
      )}

      {/* Modern Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 mb-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2.5 px-4 py-3 text-xs font-semibold rounded-t-xl transition border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'roster'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Directory & Shifts
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {staffList.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('register');
            setRegSuccess(null);
            setRegError(null);
          }}
          className={`flex items-center gap-2.5 px-4 py-3 text-xs font-semibold rounded-t-xl transition border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'register'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Register New Staff
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            Auth
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2.5 px-4 py-3 text-xs font-semibold rounded-t-xl transition border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Attendance Log Viewer
          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {logsList.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STAFF DIRECTORY & ROSTER                                          */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Search & Role Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teachers by name, email, or designation..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 w-full sm:w-auto"
              >
                <option value="all">All Roles</option>
                <option value="staff">Staff Only</option>
                <option value="admin">Administrators Only</option>
              </select>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Staff Member</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Shift Time</th>
                    <th className="py-3.5 px-4">Compensation & Schedule</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-slate-500">
                        <Users className="w-9 h-9 mx-auto mb-2 opacity-30 text-slate-400" />
                        <div className="font-semibold text-slate-400">No staff members found</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Try adjusting your search criteria or register a new staff member.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-850/40 transition">
                        {/* Member Name & Email */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs">
                              {staff.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{staff.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {staff.email || 'No email associated'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Designation */}
                        <td className="py-3.5 px-4">
                          <span className="text-slate-300 font-medium">
                            {staff.designation || <span className="text-slate-500 italic">Unassigned</span>}
                          </span>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {staff.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              <UserCheck className="w-3 h-3 text-slate-400" /> Staff
                            </span>
                          )}
                        </td>

                        {/* Shift Time */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            {staff.shift_start_time}
                          </span>
                        </td>

                        {/* Salary & Days */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="text-[11px] font-mono text-slate-300">
                              {staff.salary != null ? (
                                <span className="text-emerald-400 font-semibold">
                                  ${Number(staff.salary).toLocaleString()} /mo
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Salary not set</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(staff.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']).map((day) => (
                                <span
                                  key={day}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 font-mono"
                                >
                                  {day}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(staff)}
                              title="Edit Staff"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingStaff(staff)}
                              title="Delete Staff"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-800/50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REGISTER NEW STAFF (MULTI-COLUMN FORM)                              */}
      {/* ========================================================================= */}
      {activeTab === 'register' && (
        <div className="max-w-4xl mx-auto">
          {/* Success Banner Card */}
          {regSuccess && (
            <div className="mb-8 p-6 bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white mb-1">
                    Staff Account Provisioned Successfully
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    The Supabase Auth user has been created and synced with the school profile roster without logging you out.
                  </p>

                  {/* Credentials Box */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-2 mb-4">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                      <span className="text-slate-500">Name:</span>
                      <span className="font-semibold text-white">{regSuccess.staff.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                      <span className="text-slate-500">Email:</span>
                      <span className="text-emerald-400 font-medium">{regSuccess.staff.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Temporary Password:</span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-bold border border-slate-800">
                        {regSuccess.password}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={copyCredentials}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition active:scale-95"
                    >
                      {copiedPassword ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          Credentials Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Credentials
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setRegSuccess(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
                    >
                      Register Another Staff
                    </button>

                    <button
                      onClick={() => setActiveTab('roster')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                    >
                      View in Staff Directory
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Registration Form Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">New Staff Registration</h2>
                <p className="text-xs text-slate-400">
                  Provision an official staff account with Supabase Auth credentials and configured shift schedule.
                </p>
              </div>
            </div>

            {regError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              {/* Multi-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Identity & Credentials */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Arthur Vance"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. arthur.vance@school.edu"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Used for Supabase Auth login and attendance verification.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Initial Password</span>
                      <span className="text-[10px] text-slate-500">Leave blank to auto-generate</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="e.g. Staff2026! or auto"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      System Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRegRole('staff')}
                        className={`p-3 rounded-xl border text-xs font-medium text-left flex items-center gap-2.5 transition ${
                          regRole === 'staff'
                            ? 'bg-slate-950 border-emerald-500 text-emerald-300 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-white">Staff</div>
                          <div className="text-[10px] text-slate-500">Standard Check-in</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegRole('admin')}
                        className={`p-3 rounded-xl border text-xs font-medium text-left flex items-center gap-2.5 transition ${
                          regRole === 'admin'
                            ? 'bg-slate-950 border-emerald-500 text-emerald-300 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-white">Admin</div>
                          <div className="text-[10px] text-slate-500">Full Dashboard Access</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 2: Role, Shift, Salary */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Designation / Department
                    </label>
                    <div className="relative">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={regDesignation}
                        onChange={(e) => setRegDesignation(e.target.value)}
                        placeholder="e.g. Head of Mathematics"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Scheduled Shift Start Time</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-semibold">{regShift}</span>
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="time"
                        step="1"
                        value={regShift}
                        onChange={(e) => setRegShift(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                      />
                    </div>
                    {/* Quick Shift Presets */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-500">Presets:</span>
                      {['07:30:00', '08:00:00', '08:30:00', '09:00:00'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRegShift(preset)}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition"
                        >
                          {preset.substring(0, 5)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Monthly Salary ($ USD)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={regSalary}
                        onChange={(e) => setRegSalary(e.target.value)}
                        placeholder="e.g. 4800"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Days Checkbox Group */}
              <div className="pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300">
                    Scheduled Working Days
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setRegWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}
                      className="text-emerald-400 hover:underline"
                    >
                      Weekdays (Mon-Fri)
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setRegWorkingDays([...ALL_DAYS])}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      All 7 Days
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {ALL_DAYS.map((day) => {
                    const isSelected = regWorkingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day, regWorkingDays, setRegWorkingDays)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold font-mono border transition flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Provisioning Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Register Staff Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ATTENDANCE LOG VIEWER (HISTORICAL AUDIT LOG)                       */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Audit Header & Range Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                  <History className="w-3.5 h-3.5" />
                  Historical Audit Logs
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Attendance Records & Audit Trail
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Default query loads the past 3 months. Select custom dates to filter historical punches.
                </p>
              </div>

              {/* Quick Stat Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-500 mr-1.5 font-medium">Total:</span>
                  <span className="font-bold text-white font-mono">{logStats.total}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-400">
                  <span className="opacity-75 mr-1.5 font-medium">Present:</span>
                  <span className="font-bold font-mono">{logStats.present}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-400">
                  <span className="opacity-75 mr-1.5 font-medium">Late:</span>
                  <span className="font-bold font-mono">{logStats.late}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-400">
                  <span className="opacity-75 mr-1.5 font-medium">Absent:</span>
                  <span className="font-bold font-mono">{logStats.absent}</span>
                </div>
              </div>
            </div>

            {/* Date Pickers Form */}
            <form
              onSubmit={handleFilterLogs}
              className="pt-4 border-t border-slate-800/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-medium">From:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-medium">To:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isFilteringLogs}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 transition"
                >
                  {isFilteringLogs ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Filter className="w-3.5 h-3.5" />
                  )}
                  Filter Records
                </button>

                <button
                  type="button"
                  onClick={handleResetLogRange}
                  disabled={isFilteringLogs}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                >
                  Reset (3 Months)
                </button>
              </div>

              {/* Status & Name Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Search logs by staff..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            </form>

            {logFilterMessage && (
              <div className="text-[11px] text-emerald-400 font-mono animate-fade-in">
                {logFilterMessage}
              </div>
            )}
          </div>

          {/* Logs Data Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Staff Member</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4">Check-in Timestamp</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Punch ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center text-slate-500">
                        <FileSpreadsheet className="w-9 h-9 mx-auto mb-2 opacity-30 text-slate-400" />
                        <div className="font-semibold text-slate-400">No attendance logs found</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          No punch events registered for the selected date range.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const logDate = new Date(log.check_in_time);
                      const formattedDate = !isNaN(logDate.getTime())
                        ? logDate.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : log.check_in_time;
                      const formattedTime = !isNaN(logDate.getTime())
                        ? logDate.toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '';

                      return (
                        <tr key={log.id} className="hover:bg-slate-850/40 transition">
                          {/* Teacher Name */}
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-[11px]">
                                {(log.profiles?.name || 'T').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-white">
                                {log.profiles?.name || 'Unassigned Teacher'}
                              </span>
                            </div>
                          </td>

                          {/* Designation */}
                          <td className="py-3.5 px-4">
                            <span className="text-slate-400">
                              {log.profiles?.designation || <span className="italic text-slate-600">N/A</span>}
                            </span>
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-slate-200">{formattedDate}</div>
                            <div className="font-mono text-[10px] text-slate-500">{formattedTime}</div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {log.status === 'present' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Present
                              </span>
                            )}
                            {log.status === 'late' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Late
                              </span>
                            )}
                            {log.status === 'absent' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                Absent
                              </span>
                            )}
                          </td>

                          {/* Short Monospace UUID */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {log.id.substring(0, 8)}...
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT STAFF MODAL                                                          */}
      {/* ========================================================================= */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                Edit Staff Profile
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Designation / Department
                </label>
                <input
                  type="text"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  placeholder="e.g. Physics Teacher"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Salary ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                    placeholder="e.g. 4500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  System Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="staff">Staff (Standard Check-in)</option>
                  <option value="admin">Administrator (Full Dashboard Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Scheduled Working Days
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {ALL_DAYS.map((day) => {
                    const isSelected = editWorkingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day, editWorkingDays, setEditWorkingDays)}
                        className={`py-1.5 rounded-lg text-[11px] font-mono border font-semibold transition ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 transition"
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG                                                */}
      {/* ========================================================================= */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Remove Staff Member?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to remove <span className="text-white font-semibold">{deletingStaff.name}</span>? This will permanently delete their profile and associated attendance logs.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="w-1/2 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteConfirm}
                className="w-1/2 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 shadow-lg shadow-rose-600/20 transition"
              >
                {isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
