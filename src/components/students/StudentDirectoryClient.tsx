'use client';

import React, { useState, useEffect, useCallback, useTransition, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Search,
  MessageCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  GraduationCap,
  X,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { Student } from '@/types/supabase';
import { fetchClasses, fetchStudents, addStudent } from '@/app/dashboard/students/actions';
import Link from 'next/link';

interface StudentDirectoryClientProps {
  initialClasses?: string[];
}

export default function StudentDirectoryClient({
  initialClasses = [],
}: StudentDirectoryClientProps) {
  const [classes, setClasses] = useState<string[]>(initialClasses);
  const [filterClass, setFilterClass] = useState<string>(
    initialClasses.length > 0 ? initialClasses[0] : ''
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [isLoadingClasses, setIsLoadingClasses] = useState(initialClasses.length === 0);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Clipboard copy state
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setIsLoadingClasses(true);
    try {
      const res = await fetchClasses();
      if (res.success && res.data) {
        setClasses(res.data);
        if (res.data.length > 0) {
          setFilterClass((prev) => prev || res.data![0]);
        }
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error('Failed to load academic classes.');
    } finally {
      setIsLoadingClasses(false);
    }
  }, []);

  // 1. Load classes if not provided initially
  useEffect(() => {
    if (initialClasses.length === 0) {
      loadClasses();
    }
  }, [initialClasses, loadClasses]);

  // 2. Load students whenever filterClass changes
  useEffect(() => {
    if (filterClass) {
      loadStudentsForClass(filterClass);
    } else {
      setStudents([]);
    }
  }, [filterClass]);

  const loadStudentsForClass = async (className: string, silent = false) => {
    if (!className) {
      setStudents([]);
      return;
    }
    if (!silent) setIsLoadingStudents(true);
    else setIsRefreshing(true);

    try {
      const res = await fetchStudents(className);
      if (res.success && res.data) {
        setStudents(res.data);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error('Failed to load student roster.');
    } finally {
      setIsLoadingStudents(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (filterClass) {
      loadStudentsForClass(filterClass, true);
    }
  };

  // 3. Open Modal helper
  const handleOpenAddModal = (targetClass?: string) => {
    setSelectedClass(targetClass || '');
    setName('');
    setRollNumber('');
    setPhone('');
    setModalError(null);
    setIsModalOpen(true);
  };

  // 4. Submit Add Student form
  const handleSubmitStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const targetClass = selectedClass.trim();
    if (!targetClass) {
      setModalError('Please enter or select a class for this student.');
      return;
    }
    if (!name.trim()) {
      setModalError('Please enter the student full name.');
      return;
    }
    const roll = parseInt(rollNumber, 10);
    if (isNaN(roll) || roll <= 0) {
      setModalError('Roll number must be a positive whole number.');
      return;
    }
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (!cleanPhone || !/^[0-9]{10,15}$/.test(cleanPhone)) {
      setModalError('Please enter a valid WhatsApp number with country code (e.g. 919876543210).');
      return;
    }

    startSubmitTransition(async () => {
      try {
        const res = await addStudent(targetClass, name, roll, cleanPhone);
        if (res.success && res.student) {
          toast.success(`Student "${res.student.name}" (Roll ${res.student.roll_number}) enrolled in ${targetClass} successfully!`);
          setIsModalOpen(false);

          // If targetClass is not in classes, add dynamically
          setClasses((prev) => {
            if (!prev.includes(targetClass)) {
              return [...prev, targetClass].sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
              );
            }
            return prev;
          });

          // If added to currently filtered class, update list immediately
          if (targetClass === filterClass) {
            setStudents((prev) => {
              const updated = [...prev, res.student!];
              return updated.sort((a, b) => a.roll_number - b.roll_number);
            });
          } else {
            // Switch to that class in the directory filter
            setFilterClass(targetClass);
          }
        } else {
          const errMsg = res.error || 'Failed to enroll student.';
          setModalError(errMsg);
          toast.error(errMsg);
        }
      } catch (err: any) {
        const msg = err.message || 'An unexpected error occurred.';
        setModalError(msg);
        toast.error(msg);
      }
    });
  };

  // 5. Copy Phone to Clipboard
  const handleCopyPhone = (ph: string) => {
    navigator.clipboard.writeText(ph);
    setCopiedPhone(ph);
    toast.success('Parent WhatsApp number copied!');
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // 6. Filter students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        String(s.roll_number).includes(query) ||
        s.parent_whatsapp.includes(query)
    );
  }, [students, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & PRIMARY ACTION                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-teal-700 uppercase tracking-wider mb-1">
            <GraduationCap size={15} />
            <span>Academic Roster & Enrollment</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Student Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage class rosters, roll allocations, and parent WhatsApp communication channels.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAddModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <UserPlus size={16} />
          <span>Enroll Student</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. CLASS SELECTOR & SEARCH BAR                                            */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Class Selection Dropdown */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label
            htmlFor="class-selector"
            className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0"
          >
            Class:
          </label>
          <div className="relative flex-1 sm:w-64">
            <select
              id="class-selector"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              disabled={isLoadingClasses || classes.length === 0}
              className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer disabled:opacity-50"
            >
              {classes.length === 0 ? (
                <option value="">No classes yet</option>
              ) : (
                classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoadingStudents || isRefreshing || !filterClass}
            title="Refresh Roster"
            aria-label="Refresh Roster"
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer disabled:opacity-40"
          >
            <RefreshCw
              size={15}
              className={isLoadingStudents || isRefreshing ? 'animate-spin text-teal-600' : ''}
            />
          </button>
        </div>

        {/* Filter Search Input */}
        <div className="relative w-full sm:w-72">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, roll, phone..."
            className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ROSTER TABLE / EMPTY STATES                                            */}
      {/* ========================================================================= */}
      {isLoadingClasses ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <Loader2 size={32} className="animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading academic classes...</p>
        </div>
      ) : classes.length === 0 ? (
        /* Zero Classes in School */
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center shadow-2xs space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
            <UserPlus size={24} />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-base font-bold text-slate-900">No Student Classes Enrolled Yet</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Start building student rosters by enrolling your first student. Classes are created dynamically on the fly!
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Enroll First Student</span>
          </button>
        </div>
      ) : isLoadingStudents ? (
        /* Loading Students State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <Loader2 size={32} className="animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading student roster...</p>
          <p className="text-xs text-slate-400 mt-1">
            Fetching enrolled records for {filterClass || 'selected class'}
          </p>
        </div>
      ) : students.length === 0 ? (
        /* Empty State: Class has zero students */
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center shadow-2xs space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Users size={26} />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-base font-bold text-slate-900">
              No students enrolled in this class yet.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Start building the class roster for{' '}
              <span className="font-semibold text-slate-700">{filterClass}</span> by
              adding student profiles with their roll numbers and WhatsApp contacts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAddModal(filterClass)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Enroll First Student</span>
          </button>
        </div>
      ) : filteredStudents.length === 0 ? (
        /* Search Query Has No Matches */
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-2xs space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Search size={20} />
          </div>
          <h2 className="text-sm font-bold text-slate-900">No matching students found</h2>
          <p className="text-xs text-slate-500">
            No students in {filterClass} matched &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs font-semibold text-teal-600 hover:underline pt-1 cursor-pointer"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        /* Roster Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Table Meta Bar */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Class Roster:
              </span>
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                {filterClass}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}{' '}
              Enrolled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th scope="col" className="py-3 px-5 w-24">
                    Roll Number
                  </th>
                  <th scope="col" className="py-3 px-5">
                    Student Name
                  </th>
                  <th scope="col" className="py-3 px-5">
                    Parent WhatsApp
                  </th>
                  <th scope="col" className="py-3 px-5 text-right">
                    Quick Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredStudents.map((student) => {
                  const whatsappUrl = `https://wa.me/${student.parent_whatsapp}`;
                  const isPhoneCopied = copiedPhone === student.parent_whatsapp;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Roll Number */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 shadow-2xs">
                          #{student.roll_number}
                        </span>
                      </td>

                      {/* Student Name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-teal-500 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {student.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Enrolled {student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Active'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Parent WhatsApp */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                            <MessageCircle size={13} />
                          </div>
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            +{student.parent_whatsapp}
                          </span>
                        </div>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(student.parent_whatsapp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            title="Copy WhatsApp Number"
                          >
                            {isPhoneCopied ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
                            title="Open WhatsApp chat"
                          >
                            <span>Chat</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADD STUDENT MODAL                                                      */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          {/* Modal Card */}
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 id="modal-title" className="text-sm font-bold text-slate-900">
                    Enroll New Student
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add a student to the class roster and set contact details.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitStudent} className="p-5 space-y-4">
              {/* Error Banner */}
              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                  <span className="font-medium leading-relaxed">{modalError}</span>
                </div>
              )}

              {/* Target Class Input with Datalist */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="modal-class-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Target Class <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-teal-600 font-medium">Type any class or choose existing</span>
                </div>
                <input
                  id="modal-class-input"
                  list="classes-datalist"
                  type="text"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  placeholder="e.g. Class 9, Class 10..."
                  disabled={isSubmitting}
                  className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  required
                  autoComplete="off"
                />
                <datalist id="classes-datalist">
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Student Name */}
              <div>
                <label
                  htmlFor="student-name-input"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Student Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="student-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  disabled={isSubmitting}
                  className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  required
                  autoFocus
                />
              </div>

              {/* Roll Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="student-roll-input"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Roll Number <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Unique per class</span>
                </div>
                <input
                  id="student-roll-input"
                  type="number"
                  min="1"
                  step="1"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 1"
                  disabled={isSubmitting}
                  className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  required
                />
              </div>

              {/* Parent WhatsApp */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="student-phone-input"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Parent WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Numeric country code</span>
                </div>
                <input
                  id="student-phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 919876543210"
                  disabled={isSubmitting}
                  className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Include country code (e.g. <strong>91</strong> for India) without plus or spaces.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Enrolling...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} />
                      <span>Enroll Student</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
