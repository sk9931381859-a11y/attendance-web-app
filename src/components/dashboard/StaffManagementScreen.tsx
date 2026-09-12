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
} from 'lucide-react';
import {
  StaffMember,
  createStaffAction,
  updateStaffAction,
  deleteStaffAction,
} from '@/app/actions/staff';

interface StaffManagementScreenProps {
  initialStaff: StaffMember[];
}

export default function StaffManagementScreen({ initialStaff }: StaffManagementScreenProps) {
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'admin'>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formShift, setFormShift] = useState('08:00:00');
  const [formRole, setFormRole] = useState<'staff' | 'admin'>('staff');
  const [formEmail, setFormEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Filter staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, roleFilter]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormName('');
    setFormShift('08:00:00');
    setFormRole('staff');
    setFormEmail('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    // Format shift to HH:MM:SS or HH:MM
    setFormShift(staff.shift_start_time || '08:00:00');
    setFormRole(staff.role);
    setFormEmail(staff.email || '');
    setFormError(null);
  };

  // Submit Add Staff
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Staff name is required.');
      return;
    }

    setFormError(null);
    startTransition(async () => {
      // Normalize time to HH:MM:SS
      let normalizedShift = formShift.trim();
      if (normalizedShift.length === 5) {
        normalizedShift = `${normalizedShift}:00`;
      }

      const res = await createStaffAction({
        name: formName.trim(),
        shift_start_time: normalizedShift,
        role: formRole,
        email: formEmail.trim() || undefined,
      });

      if (!res.success || !res.staff) {
        setFormError(res.error || 'Failed to add staff member.');
        return;
      }

      setStaffList((prev) => [...prev, res.staff!].sort((a, b) => a.name.localeCompare(b.name)));
      setIsAddModalOpen(false);
      setSuccessMessage(`Staff member "${res.staff.name}" was added successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    });
  };

  // Submit Edit Staff
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!formName.trim()) {
      setFormError('Staff name is required.');
      return;
    }

    setFormError(null);
    startTransition(async () => {
      let normalizedShift = formShift.trim();
      if (normalizedShift.length === 5) {
        normalizedShift = `${normalizedShift}:00`;
      }

      const res = await updateStaffAction({
        id: editingStaff.id,
        name: formName.trim(),
        shift_start_time: normalizedShift,
        role: formRole,
      });

      if (!res.success || !res.staff) {
        setFormError(res.error || 'Failed to update staff member.');
        return;
      }

      setStaffList((prev) =>
        prev
          .map((s) => (s.id === res.staff!.id ? res.staff! : s))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingStaff(null);
      setSuccessMessage(`Updated details for "${res.staff.name}".`);
      setTimeout(() => setSuccessMessage(null), 4000);
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
      setSuccessMessage(`Staff member "${deletingStaff.name}" has been removed.`);
      setDeletingStaff(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" />
            School Staff Roster
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Staff Directory & Shifts
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono font-medium">
              {staffList.length} Total
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Add teachers, modify scheduled shift start times, and configure administrator roles.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Add New Staff
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-3 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Controls: Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teachers by name or email..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 w-full sm:w-auto"
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
            <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Staff Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Shift Start Time</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No staff members match your criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-850/40 transition">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
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
                    <td className="py-3.5 px-4">
                      {staff.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          <UserCheck className="w-3 h-3 text-slate-400" /> Staff
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        {staff.shift_start_time}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(staff)}
                          title="Edit Staff"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingStaff(staff)}
                          title="Delete Staff"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition"
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

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add New Staff Member</h3>
                <p className="text-[11px] text-slate-400">Creates a new profile in the database.</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. John Watson"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Scheduled Shift Start Time (HH:MM:SS)
                </label>
                <input
                  type="time"
                  step="1"
                  required
                  value={formShift}
                  onChange={(e) => setFormShift(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="staff">Staff (Teacher)</option>
                  <option value="admin">Administrator (Principal)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Email <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. j.watson@school.edu"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
                >
                  {isPending ? 'Saving...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setEditingStaff(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Edit Staff Member</h3>
                <p className="text-[11px] text-slate-400">Modify profile name and shift schedule.</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Scheduled Shift Start Time (HH:MM:SS)
                </label>
                <input
                  type="time"
                  step="1"
                  required
                  value={formShift}
                  onChange={(e) => setFormShift(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="staff">Staff (Teacher)</option>
                  <option value="admin">Administrator (Principal)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
                >
                  {isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Delete Staff Member?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to delete <strong className="text-white">{deletingStaff.name}</strong>?
              Their attendance history will also be removed.
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteConfirm}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/20"
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
