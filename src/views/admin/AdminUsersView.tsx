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
import { Users, Shield, Trash2, Ban, CheckCircle2, Search, Mail } from 'lucide-react';

interface AdminUsersViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ navigate, onShowMessage }) => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const items = await getAllUsers();
      setUsers(items);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid: string, userEmail: string, newRole: UserRole) => {
    try {
      await updateUserRole(uid, newRole, userEmail);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        `Changed User Role to ${newRole}`,
        'Users',
        uid,
        userEmail
      );
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
      onShowMessage(`Updated user role to ${newRole}.`);
    } catch (err: any) {
      onShowMessage(err.message || 'Failed to update user role.');
    }
  };

  const handleStatusToggle = async (uid: string, userEmail: string, currentStatus?: UserStatus) => {
    const nextStatus: UserStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await toggleUserStatus(uid, nextStatus, userEmail);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        `Toggled User Status to ${nextStatus}`,
        'Users',
        uid,
        userEmail
      );
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status: nextStatus } : u)));
      onShowMessage(`User status changed to ${nextStatus}.`);
    } catch (err: any) {
      onShowMessage(err.message || 'Failed to update user status.');
    }
  };

  const handleDelete = async (uid: string, userEmail: string) => {
    if (window.confirm('Delete this user account document from Firestore?')) {
      try {
        await deleteUserDoc(uid, userEmail);
        await logAdminActivity(
          user?.uid || '',
          user?.email || '',
          'Deleted User Document',
          'Users',
          uid,
          userEmail
        );
        setUsers((prev) => prev.filter((u) => u.uid !== uid));
        onShowMessage('User record deleted.');
      } catch (err: any) {
        onShowMessage(err.message || 'Failed to delete user.');
      }
    }
  };

  const filtered = users.filter(
    (u) =>
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout currentTab="users" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>User & Account Management</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Registered Users Directory
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Total registered users: {users.length} &bull; Manage roles (Admin/User), permissions, and account suspension.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users by email, display name, or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050A14] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading user registry...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-12 text-center text-[#94A3B8]">
            No user profiles found.
          </div>
        ) : (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {filtered.map((u) => (
                <div
                  key={u.uid}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`}
                      alt={u.displayName || 'Avatar'}
                      className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {u.displayName || 'Anonymous User'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-white/5 text-[#94A3B8]'
                          }`}
                        >
                          {u.role || 'user'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#94A3B8] flex items-center gap-2 mt-0.5">
                        <span className="text-white/80">{u.email}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">{u.uid.slice(0, 10)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <select
                      value={u.role || 'user'}
                      onChange={(e) =>
                        handleRoleChange(u.uid, u.email || '', e.target.value as UserRole)
                      }
                      className="bg-[#050A14] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white outline-none focus:border-purple-500"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleStatusToggle(u.uid, u.email || '', u.status)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        u.status === 'suspended'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                          : 'bg-white/5 text-[#94A3B8] hover:text-white'
                      }`}
                      title="Suspend / Activate"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{u.status === 'suspended' ? 'Suspended' : 'Active'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(u.uid, u.email || '')}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
