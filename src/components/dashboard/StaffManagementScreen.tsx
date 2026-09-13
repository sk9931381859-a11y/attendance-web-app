'use client';

import React, { useState, useMemo, useTransition, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  BarChart2,
  Users,
  UserPlus,
  Clock,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  X,
  CheckCircle2,
  Calendar,
  DollarSign,
  Briefcase,
  Mail,
  Check,
  RefreshCw,
  FileSpreadsheet,
  LogOut,
  ChevronDown,
  ChevronUp,
  Plus,
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Filter,
} from 'lucide-react';
import {
  StaffMember,
  AttendanceLogRecord,
  registerStaffAction,
  updateStaffAction,
  deleteStaffAction,
  getStaffListAction,
  getAttendanceLogsAction,
} from '@/app/dashboard/manage/actions';
import { signOutAction } from '@/app/actions/auth';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHIFT_PRESETS = ['07:30', '08:00', '08:30', '09:00'];

interface StaffManagementScreenProps {
  initialStaff: StaffMember[];
  initialLogs: AttendanceLogRecord[];
}

export default function StaffManagementScreen({
  initialStaff,
  initialLogs,
}: StaffManagementScreenProps) {
  // Staff State
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'admin'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regDesignation, setRegDesignation] = useState('');
  const [regShift, setRegShift] = useState('08:00');
  const [regSalary, setRegSalary] = useState('');
  const [regWorkingDays, setRegWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [regRole, setRegRole] = useState<'staff' | 'admin'>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<{
    staff: StaffMember;
    generatedPassword?: string;
  } | null>(null);

  // Generate random secure temporary password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!24';
    setRegPassword(pass);
  };

  // Edit Modal State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editShift, setEditShift] = useState('08:00');
  const [editSalary, setEditSalary] = useState('');
  const [editWorkingDays, setEditWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'staff' | 'admin'>('staff');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Modal State
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Logs Section State (Collapsible)
  const [showLogs, setShowLogs] = useState(false);
  const [logsList, setLogsList] = useState<AttendanceLogRecord[]>(initialLogs);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all');

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

  // Format shift time for display (e.g., '08:00:00' -> '08:00 AM')
  const formatShiftTime = (timeStr?: string) => {
    if (!timeStr) return '08:00 AM';
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${String(formattedHours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Format currency
  const formatSalary = (amount?: number | null) => {
    if (amount == null || isNaN(amount)) return '—';
    return (
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount) + '/mo'
    );
  };

  // Toggle working day checkbox
  const toggleWorkingDay = (
    day: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (current.includes(day)) {
      if (current.length === 1) return; // Keep at least one day
      setter(current.filter((d) => d !== day));
    } else {
      setter([...current, day]);
    }
  };

  // Refresh Staff List
  const handleRefreshStaff = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await getStaffListAction();
      setStaffList(refreshed);
    } catch (err) {
      console.error('Failed to refresh staff:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sign out
  const handleSignOut = () => {
    startLogout(async () => {
      await signOutAction();
    });
  };

  // Handle Registration Form Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    const trimmedName = regName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setRegError('Please provide a valid staff full name (minimum 2 characters).');
      return;
    }

    const trimmedEmail = regEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setRegError('A valid staff email address is required.');
      return;
    }

    const trimmedPassword = regPassword.trim();
    if (!trimmedPassword || trimmedPassword.length < 6) {
      setRegError('A temporary password of at least 6 characters is required.');
      return;
    }

    if (regWorkingDays.length === 0) {
      setRegError('Please select at least one scheduled working day.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerStaffAction({
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        designation: regDesignation.trim() || null,
        shift_start_time: regShift,
        salary: regSalary ? Number(regSalary) : null,
        working_days: regWorkingDays,
      });

      if (!res.success || !res.staff) {
        setRegError(res.error || 'Failed to register staff account.');
        setIsSubmitting(false);
        return;
      }

      // Prepend or sort into roster list
      setStaffList((prev) => [...prev, res.staff!].sort((a, b) => a.name.localeCompare(b.name)));
      setRegSuccess({
        staff: res.staff,
        generatedPassword: trimmedPassword,
      });

      // Reset form fields
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegDesignation('');
      setRegShift('08:00');
      setRegSalary('');
      setRegWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditDesignation(staff.designation || '');
    const shift = staff.shift_start_time ? staff.shift_start_time.substring(0, 5) : '08:00';
    setEditShift(shift);
    setEditSalary(staff.salary != null ? String(staff.salary) : '');
    setEditRole(staff.role);
    setEditEmail(staff.email || '');
    setEditWorkingDays(
      staff.working_days && staff.working_days.length > 0
        ? staff.working_days
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    );
    setEditError(null);
  };

  // Submit Edit Staff
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!editName.trim()) {
      setEditError('Staff name is required.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      const res = await updateStaffAction({
        id: editingStaff.id,
        name: editName.trim(),
        designation: editDesignation.trim() || null,
        shift_start_time: editShift,
        salary: editSalary ? Number(editSalary) : null,
        working_days: editWorkingDays,
        role: editRole,
        email: editEmail.trim() || null,
      });

      if (!res.success || !res.staff) {
        setEditError(res.error || 'Failed to update staff member.');
        setIsUpdating(false);
        return;
      }

      setStaffList((prev) =>
        prev
          .map((s) => (s.id === res.staff!.id ? res.staff! : s))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingStaff(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update staff member.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (staff: StaffMember) => {
    setDeletingStaff(staff);
  };

  // Confirm Delete Staff
  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return;

    setIsDeleting(true);
    try {
      const res = await deleteStaffAction(deletingStaff.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete staff member.');
        setIsDeleting(false);
        return;
      }

      setStaffList((prev) => prev.filter((s) => s.id !== deletingStaff.id));
      setDeletingStaff(null);
    } catch (err) {
      console.error('Failed to delete staff:', err);
      alert('An error occurred while deleting staff member.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        (s.designation && s.designation.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q));
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, roleFilter]);

  // Filter attendance logs
  const filteredLogs = useMemo(() => {
    return logsList.filter((log) => {
      const teacherName = log.profiles?.name || '';
      const designation = log.profiles?.designation || '';
      const q = logSearchQuery.toLowerCase();
      const matchesSearch =
        teacherName.toLowerCase().includes(q) ||
        designation.toLowerCase().includes(q);
      const matchesStatus = logStatusFilter === 'all' || log.status === logStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [logsList, logSearchQuery, logStatusFilter]);

  // Filter Logs by Date
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-16">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR                                                     */}
      {/* ========================================================================= */}
      <nav className="border-b bg-white px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
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

        {/* Center: Pill Navigation Toggle */}
        <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-full border border-gray-200">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900 px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-2"
          >
            <BarChart2 size={16} />
            Live Monitoring
          </Link>
          <button className="bg-black text-white rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-semibold shadow-sm">
            <Users size={16} />
            Staff Directory
          </button>
        </div>

        {/* Right: User Info + Sign Out */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-gray-900">
              School Principal (Admin)
            </div>
            <div className="text-[11px] text-gray-500 font-mono">
              admin@attendance.app
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-semibold transition shadow-sm cursor-pointer"
          >
            <LogOut size={14} />
            <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. PAGE HEADER                                                            */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto mt-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Staff Directory & Management
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                <Users size={13} />
                {staffList.length} Active Staff
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              Register new staff profiles directly into the public.profiles database, configure shift start times and schedules, and manage existing faculty.
            </p>
          </div>

          {/* Quick link to Live Dashboard */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black bg-white border border-gray-200 px-3.5 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition"
            >
              <BarChart2 size={14} />
              Open Live Dashboard
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. NEW STAFF REGISTRATION FORM CARD                                       */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <UserPlus size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Register New Staff Member
                </h2>
                <p className="text-[11px] text-gray-500">
                  Utilizes Next.js Server Actions to insert staff records directly into public.profiles.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
              Server Action
            </span>
          </div>

          {/* Form Feedback Alerts */}
          {regError && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>{regError}</span>
            </div>
          )}

          {regSuccess && (
            <div className="mb-5 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                <div>
                  <span className="font-semibold">
                    Staff profile for &quot;{regSuccess.staff.name}&quot; successfully created!
                  </span>
                  {regSuccess.generatedPassword && (
                    <p className="text-[11px] text-green-700 mt-0.5">
                      Temporary Auth Password: <code className="bg-green-100 px-1.5 py-0.5 rounded font-mono font-bold text-green-900">{regSuccess.generatedPassword}</code>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegSuccess(null)}
                className="text-green-700 hover:text-green-900 text-xs font-semibold px-2 py-1 rounded hover:bg-green-100 transition"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegisterSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Field 1: Name */}
              <div>
                <label htmlFor="reg-staff-name" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={15} />
                  </div>
                  <input
                    id="reg-staff-name"
                    name="name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Dr. Alan Turing"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                </div>
              </div>

              {/* Field 2: Email */}
              <div>
                <label htmlFor="reg-staff-email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Staff Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={15} />
                  </div>
                  <input
                    id="reg-staff-email"
                    name="email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. alan.turing@attendance.app"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                </div>
              </div>

              {/* Field 3: Temporary Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="reg-staff-password" className="text-xs font-semibold text-gray-700">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 hover:text-teal-900 transition cursor-pointer"
                  >
                    <Sparkles size={11} />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={15} />
                  </div>
                  <input
                    id="reg-staff-password"
                    name="password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Field 4: Designation */}
              <div>
                <label htmlFor="reg-staff-designation" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Designation / Title
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Briefcase size={15} />
                  </div>
                  <input
                    id="reg-staff-designation"
                    name="designation"
                    type="text"
                    value={regDesignation}
                    onChange={(e) => setRegDesignation(e.target.value)}
                    placeholder="e.g. Senior Science Faculty"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                </div>
              </div>

              {/* Field 5: Shift Start Time */}
              <div>
                <label htmlFor="reg-staff-shift" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Shift Timings <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Clock size={15} />
                    </div>
                    <input
                      id="reg-staff-shift"
                      name="shift_start_time"
                      type="time"
                      required
                      value={regShift}
                      onChange={(e) => setRegShift(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                    />
                  </div>
                  {/* Presets */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 font-medium">Presets:</span>
                    {SHIFT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRegShift(preset)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition ${
                          regShift === preset
                            ? 'bg-black text-white border-black'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Field 6: Salary (numeric) */}
              <div>
                <label htmlFor="reg-staff-salary" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Monthly Compensation ($)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <DollarSign size={15} />
                  </div>
                  <input
                    id="reg-staff-salary"
                    name="salary"
                    type="number"
                    min="0"
                    step="100"
                    value={regSalary}
                    onChange={(e) => setRegSalary(e.target.value)}
                    placeholder="e.g. 6500"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                </div>
              </div>

              {/* Field 7: Working Days (Span full width or 3 cols) */}
              <div className="md:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Scheduled Working Days <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRegWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}
                      className="text-[10px] font-semibold text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition"
                    >
                      Weekdays (Mon–Fri)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegWorkingDays([...ALL_DAYS])}
                      className="text-[10px] font-semibold text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition"
                    >
                      All 7 Days
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => {
                    const isSelected = regWorkingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day, regWorkingDays, setRegWorkingDays)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-black text-white border-black shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                        <span>{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Form Action Controls */}
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[11px] text-gray-500">
                Staff member will be immediately available in the directory and scanner check-in system.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRegName('');
                    setRegDesignation('');
                    setRegShift('08:00');
                    setRegSalary('');
                    setRegEmail('');
                    setRegWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                    setRegError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black transition"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-xs font-semibold transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>{isSubmitting ? 'Inserting Record...' : 'Add Staff Member'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* 4. ATTENDANCE AUDIT LOG (DATA TABLE) - Directly Below Registration Form    */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    Attendance Audit Logs
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    {filteredLogs.length} Records
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  All historical attendance logs joined with staff names from profiles. Defaulted to the past 3 months.
                </p>
              </div>
            </div>

            {/* Quick Filter Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 7);
                  const s = start.toISOString().split('T')[0];
                  const e = end.toISOString().split('T')[0];
                  setStartDate(s);
                  setEndDate(e);
                  setIsFilteringLogs(true);
                  const res = await getAttendanceLogsAction({ startDate: s, endDate: e });
                  setIsFilteringLogs(false);
                  if (res.success) setLogsList(res.logs || []);
                }}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={async () => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 30);
                  const s = start.toISOString().split('T')[0];
                  const e = end.toISOString().split('T')[0];
                  setStartDate(s);
                  setEndDate(e);
                  setIsFilteringLogs(true);
                  const res = await getAttendanceLogsAction({ startDate: s, endDate: e });
                  setIsFilteringLogs(false);
                  if (res.success) setLogsList(res.logs || []);
                }}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={async () => {
                  const end = new Date();
                  const start = new Date();
                  start.setMonth(start.getMonth() - 3);
                  const s = start.toISOString().split('T')[0];
                  const e = end.toISOString().split('T')[0];
                  setStartDate(s);
                  setEndDate(e);
                  setIsFilteringLogs(true);
                  const res = await getAttendanceLogsAction({ startDate: s, endDate: e });
                  setIsFilteringLogs(false);
                  if (res.success) setLogsList(res.logs || []);
                }}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
              >
                Last 3 Months (Default)
              </button>
            </div>
          </div>

          {/* Filter Toolbar: Date Range Picker + Search + Status */}
          <div className="p-5 bg-gray-50/50 border-b border-gray-200 space-y-3">
            <form onSubmit={handleFilterLogs} className="flex flex-wrap items-end gap-3">
              {/* Date Range Picker: Start Date */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                    <Calendar size={13} />
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Date Range Picker: End Date */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                    <Calendar size={13} />
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isFilteringLogs}
                className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Filter size={13} />
                <span>{isFilteringLogs ? 'Filtering...' : 'Apply Date Filter'}</span>
              </button>
            </form>

            {logFilterMessage && (
              <div className="text-xs text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <CheckCircle2 size={14} className="text-teal-600 shrink-0" />
                <span>{logFilterMessage}</span>
              </div>
            )}

            {/* Sub-toolbar: Search by Staff Name & Status Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Filter logs by staff name..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg border border-gray-200">
                {(['all', 'present', 'late', 'absent'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setLogStatusFilter(status)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition ${
                      logStatusFilter === status
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Log Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50/80 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-5">Staff Member</th>
                  <th className="py-3 px-5">Designation</th>
                  <th className="py-3 px-5">Check-In Timestamp</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Audit Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      <FileSpreadsheet size={32} className="mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                      <p className="font-semibold text-gray-600">No attendance logs found</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Try expanding the date range filter or changing your search criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const initials = (log.profiles?.name || 'Staff')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3.5 px-5 font-medium text-gray-900">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <span className="font-semibold text-gray-900">
                              {log.profiles?.name || 'Unknown Staff Member'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-gray-600">
                          {log.profiles?.designation || <span className="text-gray-300 italic">—</span>}
                        </td>

                        <td className="py-3.5 px-5 font-mono text-gray-700">
                          {new Date(log.check_in_time).toLocaleString([], {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </td>

                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              log.status === 'present'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : log.status === 'late'
                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-red-100 text-red-700 border-red-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right font-mono text-[11px] text-gray-400">
                          {log.created_at ? new Date(log.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. REGISTERED STAFF DIRECTORY TABLE                                       */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
          {/* Table Toolbar */}
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Registered Staff Profiles Directory
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Showing {filteredStaff.length} of {staffList.length} faculty profiles from public.profiles
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff, designation, email..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                />
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${
                    roleFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setRoleFilter('staff')}
                  className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${
                    roleFilter === 'staff'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Staff
                </button>
                <button
                  onClick={() => setRoleFilter('admin')}
                  className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${
                    roleFilter === 'admin'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Admin
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={handleRefreshStaff}
                disabled={isRefreshing}
                title="Refresh staff list"
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-black hover:bg-gray-50 transition"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Staff Member</th>
                  <th className="py-3 px-5">Designation</th>
                  <th className="py-3 px-5">Shift Time</th>
                  <th className="py-3 px-5">Monthly Salary</th>
                  <th className="py-3 px-5">Working Days</th>
                  <th className="py-3 px-5">Role</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <Users size={32} className="mx-auto mb-2 text-gray-300 stroke-[1.5]" />
                      <p className="font-semibold text-gray-600">No staff members found</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {searchQuery
                          ? 'Try adjusting your search or role filter.'
                          : 'Register a staff member above to get started.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const initials = staff.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <tr
                        key={staff.id}
                        className="hover:bg-gray-50/60 transition group"
                      >
                        {/* 1. Staff Name */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100/80 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {initials || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {staff.name}
                              </div>
                              <div className="text-[11px] text-gray-400 font-mono">
                                {staff.email || `${staff.id.substring(0, 8)}...`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Designation */}
                        <td className="py-3.5 px-5 text-gray-600">
                          {staff.designation || (
                            <span className="text-gray-300 italic">Not set</span>
                          )}
                        </td>

                        {/* 3. Shift Time */}
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-mono font-medium text-[11px]">
                            <Clock size={12} className="text-gray-400" />
                            {formatShiftTime(staff.shift_start_time)}
                          </span>
                        </td>

                        {/* 4. Salary */}
                        <td className="py-3.5 px-5 font-medium text-gray-700">
                          {formatSalary(staff.salary)}
                        </td>

                        {/* 5. Working Days */}
                        <td className="py-3.5 px-5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {staff.working_days && staff.working_days.length > 0 ? (
                              staff.working_days.map((day) => (
                                <span
                                  key={day}
                                  className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium"
                                >
                                  {day}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-[11px]">Mon–Fri</span>
                            )}
                          </div>
                        </td>

                        {/* 6. Role */}
                        <td className="py-3.5 px-5">
                          {staff.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider border border-purple-200">
                              <ShieldCheck size={11} />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                              Staff
                            </span>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(staff)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition"
                              title="Edit profile"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => openDeleteModal(staff)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 transition"
                              title="Delete profile"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
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

      {/* ========================================================================= */}
      {/* 6. EDIT STAFF MODAL                                                       */}
      {/* ========================================================================= */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-gray-700" />
                <h3 className="text-sm font-bold text-gray-900">
                  Edit Staff Profile
                </h3>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  placeholder="e.g. Senior Faculty"
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Shift Start Time *
                </label>
                <div className="space-y-1.5">
                  <input
                    type="time"
                    required
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">Presets:</span>
                    {SHIFT_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditShift(p)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition ${
                          editShift === p
                            ? 'bg-black text-white border-black'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Monthly Compensation ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  placeholder="e.g. 5400"
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="e.g. staff@school.edu"
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Scheduled Working Days
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((day) => {
                    const isSelected = editWorkingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day, editWorkingDays, setEditWorkingDays)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('staff')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition text-center ${
                      editRole === 'staff'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition text-center ${
                      editRole === 'admin'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-xs font-semibold transition shadow-sm"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DELETE CONFIRMATION MODAL                                             */}
      {/* ========================================================================= */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle size={20} />
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1">
              Delete Staff Member?
            </h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-gray-900">{deletingStaff.name}</strong> from public.profiles? All corresponding attendance logs will also be cascade-deleted.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-xs font-semibold transition shadow-sm cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Staff Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
