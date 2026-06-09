'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PageHeader from '@/components/page-header';
import { Loader2, Trash2, Lock, X } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const { profile } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Column-specific filter states
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('');

  // Set up real-time listener for the users collection
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsers(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error loading users:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Guard routing for non-super_admin roles
  if (profile?.role !== 'super_admin') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/5">
          <Lock className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300 font-medium">
            Access Denied. Only system administrators can manage platform users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Update a single user's role
  const updateRole = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
        updatedBy: profile.uid,
      });
      toast.success(`Role updated successfully to ${newRole.replace(/_/g, ' ')}`);
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role: " + error.message);
    }
  };

  // Secure Individual Delete User Operation
  const deleteUser = async (userId) => {
    const confirmed = window.confirm(
      "Are you absolutely sure you want to permanently delete this user account from the platform?"
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Failed to delete user doc:", error);
      toast.error("An error occurred while attempting deletion.");
    }
  };

  // Toggle individual row checkbox
  const handleSelectRow = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Toggle master selection checkbox (excluding active session super admin)
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const selectableIds = filteredUsers
        .filter((u) => u.id !== profile?.uid)
        .map((u) => u.id);
      setSelectedUserIds(selectableIds);
    } else {
      setSelectedUserIds([]);
    }
  };

  // Determine if all selectable users are checked
  const filteredSelectable = users.filter((u) => u.id !== profile?.uid);
  const isAllSelected = 
    filteredSelectable.length > 0 &&
    filteredSelectable.every((u) => selectedUserIds.includes(u.id));

  // Execute bulk deletion
  const deleteSelectedUsers = async () => {
    if (selectedUserIds.length === 0) return;

    const confirmed = window.confirm(
      `Are you absolutely sure you want to permanently delete these ${selectedUserIds.length} user accounts? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      selectedUserIds.forEach((userId) => {
        batch.delete(doc(db, 'users', userId));
      });

      await batch.commit();
      setSelectedUserIds([]);
      toast.success(`Successfully deleted ${selectedUserIds.length} user accounts.`);
    } catch (error) {
      console.error("Failed to bulk delete users:", error);
      toast.error("Failed to execute bulk deletion: " + error.message);
    }
  };

  // Get available actions list for a user for action-based filtering
  const getUserActionsList = (u) => {
    const actions = [];
    const isSelf = u.id === profile?.uid;
    
    if (u.role === 'spectator') {
      actions.push('promote to dojo admin');
    } else if (u.role === 'dojo_admin') {
      actions.push('promote organizer', 'demote');
    } else if (u.role === 'tournament_organizer') {
      actions.push('demote to dojo admin');
    }
    
    if (!isSelf) {
      actions.push('delete user');
    }
    
    return actions;
  };

  // Filter users based on each column's active filter
  const filteredUsers = users.filter((u) => {
    // 1. Name Filter
    if (nameFilter.trim()) {
      const q = nameFilter.toLowerCase();
      if (!(u.displayName || '').toLowerCase().includes(q)) return false;
    }
    
    // 2. Email Filter
    if (emailFilter.trim()) {
      const q = emailFilter.toLowerCase();
      if (!(u.email || '').toLowerCase().includes(q)) return false;
    }
    
    // 3. Role Filter
    if (roleFilter !== 'all') {
      const targetRole = roleFilter;
      const uRole = u.role || 'spectator';
      if (uRole !== targetRole) return false;
    }
    
    // 4. Action Filter
    if (actionFilter.trim()) {
      const q = actionFilter.toLowerCase();
      const actions = getUserActionsList(u);
      if (!actions.some((act) => act.toLowerCase().includes(q))) return false;
    }
    
    return true;
  });

  const hasActiveFilters = nameFilter || emailFilter || roleFilter !== 'all' || actionFilter;

  const handleClearFilters = () => {
    setNameFilter('');
    setEmailFilter('');
    setRoleFilter('all');
    setActionFilter('');
    toast.success('All column filters cleared');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="User Management"
        description="Review security clearance levels, edit system roles, and manage user accounts."
      />

      {/* Dynamic Bulk Action Bar */}
      {selectedUserIds.length > 0 && (
        <Alert className="border-red-500/35 bg-red-500/5 text-red-300 flex items-center justify-between p-4 shadow-md">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-400" />
            <AlertDescription className="font-semibold text-sm">
              {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected for deletion
            </AlertDescription>
          </div>
          <Button
            variant="destructive"
            onClick={deleteSelectedUsers}
            size="sm"
            className="font-bold bg-red-650 hover:bg-red-700"
          >
            Bulk Delete Selected Users
          </Button>
        </Alert>
      )}

      {/* User Accounts Table */}
      <Card className="border-zinc-850 bg-zinc-950 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-48 text-zinc-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-gold-primary" />
              <span className="text-sm">Fetching user accounts...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-zinc-150 border-collapse">
                <thead>
                  {/* Primary Headers Row */}
                  <tr className="border-b border-zinc-900 bg-zinc-900/40">
                    <th className="p-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="cursor-pointer rounded border-zinc-800 bg-zinc-900 text-gold-primary focus:ring-gold-primary h-4 w-4"
                        title="Select all except yourself"
                      />
                    </th>
                    <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Name</th>
                    <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Email</th>
                    <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Role</th>
                    <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-400">Actions</th>
                  </tr>

                  {/* Excel-style Filtering Row */}
                  <tr className="border-b border-zinc-900 bg-zinc-900/25">
                    <th className="p-2 text-center w-12">
                      {hasActiveFilters ? (
                        <Button
                          variant="ghost"
                          onClick={handleClearFilters}
                          className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800 text-[10px] font-bold flex items-center gap-1 mx-auto"
                          title="Clear all active filters"
                        >
                          <X className="h-3 w-3" />
                          <span>Clear</span>
                        </Button>
                      ) : (
                        <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider">Filter</span>
                      )}
                    </th>
                    <th className="p-2 text-left">
                      <Input
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        placeholder="Search name..."
                        className="h-8 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-550 text-xs focus:border-zinc-750 w-full"
                      />
                    </th>
                    <th className="p-2 text-left">
                      <Input
                        value={emailFilter}
                        onChange={(e) => setEmailFilter(e.target.value)}
                        placeholder="Search email..."
                        className="h-8 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-550 text-xs focus:border-zinc-750 w-full"
                      />
                    </th>
                    <th className="p-2 text-left">
                      <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v)}>
                        <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100 text-xs focus:ring-1 focus:ring-gold-primary w-full">
                          <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-850 text-zinc-100">
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="tournament_organizer">Tournament Organizer</SelectItem>
                          <SelectItem value="dojo_admin">Dojo Admin</SelectItem>
                          <SelectItem value="referee">Referee</SelectItem>
                          <SelectItem value="spectator">Spectator</SelectItem>
                        </SelectContent>
                      </Select>
                    </th>
                    <th className="p-2 text-left">
                      <Input
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        placeholder="Search action..."
                        className="h-8 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-550 text-xs focus:border-zinc-750 w-full"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-zinc-500 text-sm italic">
                        No user accounts match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.id === profile?.uid;

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-zinc-900/20 transition-colors ${
                            isSelf ? 'bg-zinc-900/40 border-l-4 border-l-gold-primary' : ''
                          }`}
                        >
                          <td className="p-4 text-center">
                            {!isSelf ? (
                              <input
                                type="checkbox"
                                checked={selectedUserIds.includes(u.id)}
                                onChange={() => handleSelectRow(u.id)}
                                className="cursor-pointer rounded border-zinc-800 bg-zinc-900 text-gold-primary focus:ring-gold-primary h-4 w-4"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                disabled
                                className="cursor-not-allowed opacity-30 h-4 w-4"
                                title="Self-deletion is restricted."
                              />
                            )}
                          </td>
                          <td className="p-4 text-sm font-semibold text-zinc-200">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{u.displayName || 'Anonymous'}</span>
                              {isSelf && (
                                <Badge className="bg-gold-primary/10 text-gold-primary border-gold-primary/20 text-[9px] font-bold uppercase tracking-wide">
                                  You
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-zinc-400 truncate max-w-xs">{u.email}</td>
                          <td className="p-4 text-sm">
                            <Badge
                              variant="outline"
                              className={`capitalize font-bold text-xs py-0.5 px-2.5 ${
                                u.role === 'super_admin'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : u.role === 'tournament_organizer'
                                  ? 'bg-gold-primary/10 text-gold-primary border-gold-primary/20'
                                  : u.role === 'dojo_admin'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : u.role === 'referee'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : 'bg-zinc-900 text-zinc-450 border-zinc-800'
                              }`}
                            >
                              {u.role ? u.role.replace(/_/g, ' ') : 'Spectator'}
                            </Badge>
                          </td>
                          <td className="p-4 flex gap-2 flex-wrap items-center">
                            {u.role === 'spectator' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-zinc-800 text-xs font-semibold hover:bg-zinc-900 hover:text-white"
                                onClick={() => updateRole(u.id, 'dojo_admin')}
                              >
                                Promote to Dojo Admin
                              </Button>
                            )}

                            {u.role === 'dojo_admin' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-zinc-800 text-xs font-semibold hover:bg-zinc-900 hover:text-white"
                                  onClick={() => updateRole(u.id, 'tournament_organizer')}
                                >
                                  Promote Organizer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900"
                                  onClick={() => updateRole(u.id, 'spectator')}
                                >
                                  Demote
                                </Button>
                              </>
                            )}

                            {u.role === 'tournament_organizer' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900"
                                onClick={() => updateRole(u.id, 'dojo_admin')}
                              >
                                Demote to Dojo Admin
                              </Button>
                            )}

                            {isSelf ? (
                              <Button
                                size="sm"
                                disabled
                                className="bg-zinc-900 text-zinc-650 border border-zinc-850 cursor-not-allowed text-xs font-semibold opacity-30"
                                title="Self-deletion is structurally restricted on this session."
                              >
                                Delete User
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-950/20 text-xs font-semibold"
                                onClick={() => deleteUser(u.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}