import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import type { UserProfile, UserRole, UserStatus } from '../../types/user';
import {
  getAllUsers,
  updateUserRole,
  toggleUserStatus,
  deleteUserDoc,
} from '../../lib/firestore/admin-users';
import { logAdminActivity } from '../../lib/firestore/cms';
import { AdminLayout } from './AdminLayout';
import {
  AdminPageHeader,
  AdminSelect,
  AdminListRow,
  AdminStatusBadge,
  AdminSkeleton,
  AdminEmptyState,
  AdminConfirmDialog,
  AdminSearchInput,
} from '../../components/admin';
import {
  Users,
  Shield,
  Trash2,
  Ban,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  UserCheck,
  X,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { PINNED_SUPER_ADMIN_EMAIL, maskEmail } from '../../lib/admin-roles';

interface AdminUsersViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'superadmin', label: 'Super Admins' },
  { value: 'admin', label: 'Admins' },
  { value: 'moderator', label: 'Moderators' },
  { value: 'user', label: 'Standard Users' },
];

const ROLE_CHANGE_OPTIONS = [
  { value: 'user', label: 'Standard User' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
];

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Revealed emails set (tap to reveal)
  const [revealedEmails, setRevealedEmails] = useState<Set<string>>(new Set());

  // Detail Drawer state
  const [drawerUser, setDrawerUser] = useState<UserProfile | null>(null);

  // Confirmation dialogs
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ user: UserProfile; nextStatus: UserStatus } | null>(null);
  const [roleTarget, setRoleTarget] = useState<{ user: UserProfile; newRole: UserRole } | null>(null);
  const [banReason, setBanReason] = useState('Violation of community guidelines');
  const [processing, setProcessing] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const items = await getAllUsers();
      setUsers(items);
    } catch (err) {
      console.warn('Could not load users:', err);
      onShowMessage('Could not load user accounts list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user, isAdmin]);

  const toggleRevealEmail = (uid: string) => {
    setRevealedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  // Super admin safeguard check
  const superAdminCount = users.filter(
    (u) =>
      u.role === 'superadmin' ||
      u.email?.toLowerCase().trim() === PINNED_SUPER_ADMIN_EMAIL
  ).length;

  const isSelf = (targetUid: string) => user?.uid === targetUid;
  const isTargetPinnedAdmin = (email?: string) =>
    email?.toLowerCase().trim() === PINNED_SUPER_ADMIN_EMAIL;

  const handleRoleChange = async () => {
    if (!roleTarget) return;
    const { user: target, newRole } = roleTarget;

    // Protection checks
    if (isSelf(target.uid) && newRole !== 'superadmin' && newRole !== 'admin') {
      onShowMessage('Action blocked: You cannot demote your own admin account.');
      setRoleTarget(null);
      return;
    }
    if (
      (target.role === 'superadmin' || isTargetPinnedAdmin(target.email)) &&
      newRole !== 'superadmin' &&
      superAdminCount <= 1
    ) {
      onShowMessage('Action blocked: Cannot demote the last Super Admin.');
      setRoleTarget(null);
      return;
    }

    try {
      setProcessing(true);
      await updateUserRole(target.uid, newRole, target.email || '');
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        `Changed User Role to ${newRole}`,
        'Users',
        target.uid,
        target.email || target.displayName || target.uid
      );
      setUsers((prev) =>
        prev.map((u) => (u.uid === target.uid ? { ...u, role: newRole } : u))
      );
      if (drawerUser?.uid === target.uid) {
        setDrawerUser((prev) => (prev ? { ...prev, role: newRole } : prev));
      }
      onShowMessage(`Updated role for "${target.displayName || target.email}" to ${newRole}.`);
      setRoleTarget(null);
    } catch (err: any) {
      onShowMessage(err.message || 'Failed to update user role.');
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusTarget) return;
    const { user: target, nextStatus } = statusTarget;

    if (isSelf(target.uid)) {
      onShowMessage('Action blocked: You cannot suspend your own account.');
      setStatusTarget(null);
      return;
    }
    if (isTargetPinnedAdmin(target.email)) {
      onShowMessage('Action blocked: Root administrator cannot be suspended.');
      setStatusTarget(null);
      return;
    }

    try {
      setProcessing(true);
      await toggleUserStatus(target.uid, nextStatus, target.email || '');
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        `Set User Status to ${nextStatus} (Reason: ${banReason})`,
        'Users',
        target.uid,
        target.email || target.displayName || target.uid
      );
      setUsers((prev) =>
        prev.map((u) => (u.uid === target.uid ? { ...u, status: nextStatus } : u))
      );
      if (drawerUser?.uid === target.uid) {
        setDrawerUser((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
      onShowMessage(
        nextStatus === 'suspended'
          ? `User "${target.displayName || target.email}" has been suspended.`
          : `User "${target.displayName || target.email}" has been reactivated.`
      );
      setStatusTarget(null);
    } catch (err: any) {
      onShowMessage(err.message || 'Failed to update user status.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    if (isSelf(deleteTarget.uid)) {
      onShowMessage('Action blocked: You cannot delete your own admin account.');
      setDeleteTarget(null);
      return;
    }
    if (isTargetPinnedAdmin(deleteTarget.email)) {
      onShowMessage('Action blocked: Root administrator cannot be deleted.');
      setDeleteTarget(null);
      return;
    }
    if (deleteTarget.role === 'superadmin' && superAdminCount <= 1) {
      onShowMessage('Action blocked: Cannot delete the last Super Admin.');
      setDeleteTarget(null);
      return;
    }

    try {
      setProcessing(true);
      await deleteUserDoc(deleteTarget.uid, deleteTarget.email || '');
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Permanently Deleted User Record',
        'Users',
        deleteTarget.uid,
        deleteTarget.email || deleteTarget.displayName || deleteTarget.uid
      );
      setUsers((prev) => prev.filter((u) => u.uid !== deleteTarget.uid));
      if (drawerUser?.uid === deleteTarget.uid) {
        setDrawerUser(null);
      }
      onShowMessage(`User account "${deleteTarget.displayName || deleteTarget.email}" deleted.`);
      setDeleteTarget(null);
    } catch (err: any) {
      onShowMessage(err.message || 'Failed to delete user.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.uid || '').toLowerCase().includes(q);

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'superadmin' &&
        (u.role === 'superadmin' || isTargetPinnedAdmin(u.email))) ||
      u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (u: UserProfile) => {
    if (u.status === 'suspended') {
      return <AdminStatusBadge status="archived" label="Suspended" />;
    }
    if (u.role === 'superadmin' || isTargetPinnedAdmin(u.email)) {
      return <AdminStatusBadge status="live" label="Super Admin" />;
    }
    if (u.role === 'admin') {
      return <AdminStatusBadge status="live" label="Admin" />;
    }
    if (u.role === 'moderator') {
      return <AdminStatusBadge status="draft" label="Moderator" />;
    }
    return <AdminStatusBadge status="draft" label="User" />;
  };

  return (
    <AdminLayout currentTab="users" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-20">
        {/* Page Header */}
        <AdminPageHeader
          title="Users & Access Roles"
          description="Manage community accounts, staff role assignments, and account suspensions"
        />

        {/* 2-Column Filters: Search + Role AdminSelect */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-8">
            <AdminSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, email, or UID..."
            />
          </div>
          <div className="sm:col-span-4">
            <AdminSelect
              value={roleFilter}
              options={ROLE_FILTER_OPTIONS}
              onChange={(val) => setRoleFilter(String(val))}
            />
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="space-y-3">
            <AdminSkeleton variant="table-row" count={5} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-6 max-h-[160px] flex items-center justify-center">
            <AdminEmptyState
              icon={Users}
              title="No users found"
              description="No registered user profiles matched your filters."
              compact
            />
          </div>
        ) : (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] divide-y divide-white/5 overflow-hidden">
            {filteredUsers.map((u) => {
              const name = u.displayName || 'Anonymous Member';
              const rawEmail = u.email || 'no-email@registered';
              const isRevealed = revealedEmails.has(u.uid);
              const displayEmail = isRevealed ? rawEmail : maskEmail(rawEmail);
              const isSuspended = u.status === 'suspended';

              return (
                <AdminListRow
                  key={u.uid}
                  id={u.uid}
                  title={name}
                  meta={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRevealEmail(u.uid);
                      }}
                      className="hover:text-white transition-colors cursor-pointer text-left font-mono"
                      title={isRevealed ? 'Tap to mask' : 'Tap to reveal full email'}
                    >
                      {displayEmail} {isSelf(u.uid) && '· (You)'}
                    </button>
                  }
                  avatar={u.avatar || u.photoURL}
                  badge={getRoleBadge(u)}
                  onClick={() => setDrawerUser(u)}
                  menuItems={[
                    {
                      id: 'view-drawer',
                      label: 'View details & permissions',
                      icon: ExternalLink,
                      onClick: () => setDrawerUser(u),
                    },
                    {
                      id: 'copy-uid',
                      label: 'Copy User UID',
                      icon: Copy,
                      onClick: () => {
                        navigator.clipboard?.writeText(u.uid);
                        onShowMessage('Copied user UID to clipboard.');
                      },
                    },
                    {
                      id: 'change-role',
                      label: 'Change role...',
                      icon: Shield,
                      onClick: () =>
                        setRoleTarget({
                          user: u,
                          newRole: (u.role as UserRole) || 'user',
                        }),
                    },
                    {
                      id: 'toggle-status',
                      label: isSuspended ? 'Unban / Reactivate account' : 'Ban / Suspend account',
                      icon: Ban,
                      destructive: !isSuspended,
                      onClick: () =>
                        setStatusTarget({
                          user: u,
                          nextStatus: isSuspended ? 'active' : 'suspended',
                        }),
                    },
                    {
                      id: 'delete',
                      label: 'Delete account document',
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteTarget(u),
                    },
                  ]}
                />
              );
            })}
          </div>
        )}

        {/* User Detail Drawer */}
        {drawerUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md h-full bg-[#0B1324] border-l border-white/10 p-5 sm:p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between animate-fadeIn">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#1E88FF]" />
                    <h3 className="text-sm font-semibold text-white">User Profile Details</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerUser(null)}
                    className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[#101A30] border border-white/10 shrink-0">
                    <img
                      src={drawerUser.avatar || drawerUser.photoURL || 'https://via.placeholder.com/80'}
                      alt={drawerUser.displayName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-white truncate">
                      {drawerUser.displayName || 'Anonymous Member'}
                    </h4>
                    <p className="text-xs font-mono text-[#94A3B8] truncate">{drawerUser.email}</p>
                    <div className="mt-1">{getRoleBadge(drawerUser)}</div>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="bg-[#101A30] border border-white/5 rounded-[10px] p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8]">User UID</span>
                    <span className="font-mono text-white text-[11px] truncate max-w-[200px]">{drawerUser.uid}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8]">Account Status</span>
                    <span className="text-white capitalize">{drawerUser.status || 'Active'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8]">Joined Platform</span>
                    <span className="text-white">
                      {drawerUser.createdAt ? new Date(drawerUser.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>

                {/* Role Switcher in Drawer */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="block text-xs font-semibold text-white">
                    Assigned Staff Role
                  </label>
                  <AdminSelect
                    value={(drawerUser.role as string) || 'user'}
                    options={ROLE_CHANGE_OPTIONS}
                    onChange={(val) =>
                      setRoleTarget({
                        user: drawerUser,
                        newRole: val as UserRole,
                      })
                    }
                  />
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setStatusTarget({
                      user: drawerUser,
                      nextStatus: drawerUser.status === 'suspended' ? 'active' : 'suspended',
                    })
                  }
                  className="w-full h-10 rounded-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>
                    {drawerUser.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(drawerUser)}
                  className="w-full h-10 rounded-[10px] border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User Record</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Role Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={!!roleTarget}
          onClose={() => setRoleTarget(null)}
          onConfirm={handleRoleChange}
          title={`Change role to ${roleTarget?.newRole}?`}
          consequence={`Update staff privileges for "${roleTarget?.user.displayName || roleTarget?.user.email}".`}
          confirmLabel="Update Role"
          isDestructive={false}
          isLoading={processing}
        />

        {/* Suspend / Unban Confirmation Dialog with Reason Field */}
        {statusTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-[#0B1324] border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {statusTarget.nextStatus === 'suspended' ? 'Suspend Account?' : 'Reactivate Account?'}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    {statusTarget.user.displayName || statusTarget.user.email}
                  </p>
                </div>
              </div>

              {statusTarget.nextStatus === 'suspended' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white">
                    Reason for Suspension (Recorded in audit logs)
                  </label>
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="e.g. Inappropriate comments, spam botting..."
                    className="w-full h-10 px-3.5 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl text-xs text-white outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatusTarget(null)}
                  className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-[#94A3B8] hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleStatusToggle}
                  className="h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  {processing ? 'Processing...' : statusTarget.nextStatus === 'suspended' ? 'Suspend Account' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Dialog with Keyword DELETE */}
        <AdminConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteUser}
          title={`Delete account document for ${deleteTarget?.displayName || deleteTarget?.email}?`}
          consequence="This permanently erases the Firestore user profile document. This action cannot be reversed."
          confirmLabel="Delete Account"
          requireKeyword="DELETE"
          isDestructive={true}
          isLoading={processing}
        />
      </div>
    </AdminLayout>
  );
};
