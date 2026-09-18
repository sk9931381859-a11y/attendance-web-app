'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  Banknote,
  Lock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Users,
  RefreshCw,
  FileCheck2,
  Search,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface CalculatedPayrollItem {
  staffId: string;
  name: string;
  email: string;
  designation: string;
  baseSalary: number;
  lopDays: number;
  deductionAmount: number;
  netSalary: number;
  isLocked: boolean;
  lockedAt?: string | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function PayrollDashboard() {
  const currentDate = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed

  const [payrollItems, setPayrollItems] = useState<CalculatedPayrollItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocking, setIsLocking] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Date range calculation for selected month
  const { monthStart, monthEnd, daysInMonth } = useMemo(() => {
    const y = selectedYear;
    const m = selectedMonth;
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0)); // last day of month
    return {
      monthStart: start.toISOString().split('T')[0],
      monthEnd: end.toISOString().split('T')[0],
      daysInMonth: end.getUTCDate(),
    };
  }, [selectedYear, selectedMonth]);

  /**
   * Data Orchestration:
   * 1. Fetch all active staff from profiles table (including salary).
   * 2. Query existing payroll_runs for this period.
   * 3. If not locked, call get_monthly_penalties RPC for each staff member.
   * 4. Compute deduction_amount = (salary / 30) * lop_days & net_salary = salary - deduction_amount.
   */
  const loadPayrollData = useCallback(async () => {
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const supabase = createClient();

      // 1. Fetch active faculty & staff profiles
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, name, email, designation, salary, role')
        .order('name', { ascending: true });

      if (profError) {
        throw new Error(profError.message || 'Failed to fetch staff directory.');
      }

      if (!profiles || profiles.length === 0) {
        setPayrollItems([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch existing locked runs for this month
      const { data: lockedRuns, error: lockedError } = await supabase
        .from('payroll_runs')
        .select('staff_id, base_salary, lop_days, deduction_amount, net_salary, status, created_at')
        .eq('month_start', monthStart)
        .eq('month_end', monthEnd);

      if (lockedError) {
        console.error('Error checking payroll_runs:', lockedError);
      }

      const lockedMap = new Map<string, NonNullable<typeof lockedRuns>[number]>();
      (lockedRuns || []).forEach((run) => {
        lockedMap.set(run.staff_id, run);
      });

      // 3. Compute or resolve payroll for each staff member
      const computedList: CalculatedPayrollItem[] = await Promise.all(
        profiles.map(async (staff) => {
          const lockedRecord = lockedMap.get(staff.id);

          if (lockedRecord) {
            // Already locked in payroll_runs: use immutable locked values
            return {
              staffId: staff.id,
              name: staff.name,
              email: staff.email || '',
              designation: staff.designation || 'Faculty Member',
              baseSalary: Number(lockedRecord.base_salary || 0),
              lopDays: Number(lockedRecord.lop_days || 0),
              deductionAmount: Number(lockedRecord.deduction_amount || 0),
              netSalary: Number(lockedRecord.net_salary || 0),
              isLocked: true,
              lockedAt: lockedRecord.created_at,
            };
          }

          // Dynamic calculation via get_monthly_penalties RPC
          const baseSalary = Number(staff.salary || 0);
          let lopDays = 0;

          try {
            const { data: rpcResult, error: rpcError } = await supabase.rpc(
              'get_monthly_penalties',
              {
                p_staff_id: staff.id,
                p_month_start: monthStart,
                p_month_end: monthEnd,
              }
            );

            if (!rpcError && rpcResult !== null && rpcResult !== undefined) {
              lopDays = Number(rpcResult);
            }
          } catch (err) {
            console.warn(`RPC error for staff ${staff.name}:`, err);
          }

          // Standard 30-day payroll divisor
          const dailyRate = baseSalary / 30;
          const deductionAmount = Math.round(dailyRate * lopDays * 100) / 100;
          const netSalary = Math.max(0, Math.round((baseSalary - deductionAmount) * 100) / 100);

          return {
            staffId: staff.id,
            name: staff.name,
            email: staff.email || '',
            designation: staff.designation || 'Faculty Member',
            baseSalary,
            lopDays,
            deductionAmount,
            netSalary,
            isLocked: false,
            lockedAt: null,
          };
        })
      );

      setPayrollItems(computedList);
    } catch (err: unknown) {
      console.error('Error loading payroll data:', err);
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An unexpected error occurred while loading payroll.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    let totalBase = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalLop = 0;
    let lockedCount = 0;

    payrollItems.forEach((item) => {
      totalBase += item.baseSalary;
      totalDeductions += item.deductionAmount;
      totalNet += item.netSalary;
      totalLop += item.lopDays;
      if (item.isLocked) lockedCount++;
    });

    const isFullyLocked = payrollItems.length > 0 && lockedCount === payrollItems.length;

    return {
      totalBase,
      totalDeductions,
      totalNet,
      totalLop,
      lockedCount,
      isFullyLocked,
    };
  }, [payrollItems]);

  // Filtered staff records for UI search
  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return payrollItems;
    const q = searchFilter.toLowerCase();
    return payrollItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.designation.toLowerCase().includes(q)
    );
  }, [payrollItems, searchFilter]);

  /**
   * Payout Locking Action:
   * Batch upsert into payroll_runs table for all displayed staff,
   * permanently freezing the calculated numbers for this month.
   */
  const handleLockPayroll = async () => {
    if (payrollItems.length === 0) return;
    setIsLocking(true);
    setFeedbackMessage(null);

    try {
      const supabase = createClient();

      const batchPayload = payrollItems.map((item) => ({
        staff_id: item.staffId,
        month_start: monthStart,
        month_end: monthEnd,
        base_salary: item.baseSalary,
        lop_days: item.lopDays,
        deduction_amount: item.deductionAmount,
        net_salary: item.netSalary,
        status: 'locked',
      }));

      const { error: upsertError } = await supabase
        .from('payroll_runs')
        .upsert(batchPayload, { onConflict: 'staff_id,month_start,month_end' });

      if (upsertError) {
        throw new Error(upsertError.message || 'Failed to lock payroll records.');
      }

      setFeedbackMessage({
        type: 'success',
        text: `Payroll for ${MONTH_NAMES[selectedMonth]} ${selectedYear} has been successfully locked into permanent records.`,
      });

      // Refresh to reflect immutable locked state
      await loadPayrollData();
    } catch (err: unknown) {
      console.error('Error locking payroll:', err);
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to commit locked payroll records.',
      });
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400 shadow-inner">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Payroll Management Panel
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic Loss-of-Pay (LOP) penalty engine & permanent payout locking
              </p>
            </div>
          </div>
        </div>

        {/* Month / Year Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Month Pill Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              disabled={isLoading || isLocking}
              aria-label="Select Payroll Month"
              className="w-full sm:w-auto rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-white/25 transition backdrop-blur-md cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx} className="bg-[#0B0F19] text-slate-200">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Pill Dropdown */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              disabled={isLoading || isLocking}
              aria-label="Select Payroll Year"
              className="w-full sm:w-auto rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-white/25 transition backdrop-blur-md cursor-pointer"
            >
              {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                <option key={y} value={y} className="bg-[#0B0F19] text-slate-200">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Reload Button */}
          <button
            onClick={loadPayrollData}
            disabled={isLoading || isLocking}
            title="Recalculate with latest attendance"
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition backdrop-blur-md disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Lock Payroll Action Button */}
          <button
            onClick={handleLockPayroll}
            disabled={isLoading || isLocking || summaryMetrics.isFullyLocked}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition border backdrop-blur-md shadow-sm w-full sm:w-auto active:scale-95 ${
              summaryMetrics.isFullyLocked
                ? 'bg-white/5 text-slate-400 border-white/10 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 shadow-emerald-500/10'
            } disabled:opacity-50`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              {isLocking
                ? 'Locking Payouts...'
                : summaryMetrics.isFullyLocked
                ? 'Payroll Locked'
                : 'Lock Payroll'}
            </span>
          </button>
        </div>
      </div>

      {/* Feedback Alert Message */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-3 border backdrop-blur-md ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Base Payroll */}
        <div className="bg-black/40 border border-white/10 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Base Payroll</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
              ${summaryMetrics.totalBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {payrollItems.length} registered faculty members
          </div>
        </div>

        {/* Total Penalty Deductions (Matching Late Stat Card Aesthetic) */}
        <div className="bg-amber-950/30 border border-amber-500/30 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-amber-950/20">
          <div className="flex items-center justify-between text-amber-300 text-xs font-medium">
            <span>Total LOP Deductions</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-amber-400">
              -${summaryMetrics.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 text-xs text-amber-300/80 flex items-center justify-between flex-wrap gap-1">
            <span>{summaryMetrics.totalLop} Loss of Pay days accumulated</span>
            <span className="font-mono text-[11px] text-amber-400/60">Formula: (Salary / 30) × LOP</span>
          </div>
        </div>

        {/* Net Disbursable Payroll */}
        <div className="bg-black/40 border border-white/10 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-medium">
            <span>Net Disbursable Payout</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-emerald-400">
              ${summaryMetrics.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 text-xs text-emerald-400/80 flex items-center justify-between flex-wrap gap-1">
            <span>
              {summaryMetrics.isFullyLocked ? 'Status: Permanently Locked' : 'Status: Dynamic Draft'}
            </span>
            {summaryMetrics.isFullyLocked && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/25">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" /> Archived
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Staff Roster & Dynamic Calculations */}
      <section className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        {/* Table / List Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Payroll Breakdown & LOP Deductions
            </h2>
            <p className="text-xs text-slate-400">
              Cycle: {monthStart} to {monthEnd} ({daysInMonth} calendar days)
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search faculty name, role..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/30 border border-white/10 rounded-full text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/25 transition backdrop-blur-md"
            />
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <p className="text-xs">Evaluating attendance lateness RPC & payroll figures...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-xs">No staff members found matching criteria.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Responsive Cards Layout (block md:hidden) */}
            <div className="block md:hidden space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.staffId}
                  className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-4 space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-white">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.designation}</div>
                    </div>
                    {item.isLocked ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-slate-300 border border-white/15">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        Draft
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/10 font-mono">
                    <div>
                      <span className="text-[11px] text-slate-400 font-sans block">Base Salary</span>
                      <span className="text-slate-200">${item.baseSalary.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-sans block">LOP Days</span>
                      <span className={item.lopDays > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {item.lopDays} days
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-sans block">Deduction (LOP)</span>
                      <span className={item.deductionAmount > 0 ? 'text-amber-400' : 'text-slate-400'}>
                        -${item.deductionAmount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-sans block">Net Payout</span>
                      <span className="text-emerald-400 font-bold">${item.netSalary.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Seamless Card Container with Standard HTML Table */}
            <div className="hidden md:block rounded-2xl border border-white/10 overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-4 px-4">Faculty / Staff</th>
                      <th className="py-4 px-4">Designation</th>
                      <th className="py-4 px-4 text-right">Base Salary</th>
                      <th className="py-4 px-4 text-center">LOP Days</th>
                      <th className="py-4 px-4 text-right">Deduction (LOP)</th>
                      <th className="py-4 px-4 text-right">Net Payable</th>
                      <th className="py-4 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredItems.map((item) => (
                      <tr key={item.staffId} className="hover:bg-white/[0.03] transition duration-150">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-sm text-white">{item.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{item.email}</div>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-300">
                          {item.designation}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-sm text-slate-200">
                          ${item.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full font-mono text-xs font-semibold ${
                              item.lopDays > 0
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                                : 'bg-white/5 text-slate-400 border border-white/10'
                            }`}
                          >
                            {item.lopDays}
                          </span>
                        </td>
                        <td className={`py-4 px-4 text-right font-mono text-sm ${item.deductionAmount > 0 ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
                          -${item.deductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-sm font-bold text-emerald-400">
                          ${item.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {item.isLocked ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-slate-300 border border-white/15">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              Draft
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
