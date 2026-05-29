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

export default function UsersPage() {
  const { profile } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

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
      }
    );

    return () => unsub();
  }, []);

  // Guard routing for non-super_admin roles
  if (profile?.role !== 'super_admin') {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">
          Access Denied
        </h2>
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
    } catch (error) {
      console.error("Failed to update role:", error);
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
      // Clean up selection state if active on the deleted user
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    } catch (error) {
      console.error("Failed to delete user doc:", error);
      alert("An error occurred while attempting deletion. Check console for details.");
    }
  };

  /* ==========================================================================
     BULK SELECTION LOGIC
     ========================================================================== */

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
      const selectableIds = users
        .filter((u) => u.id !== profile?.uid)
        .map((u) => u.id);
      setSelectedUserIds(selectableIds);
    } else {
      setSelectedUserIds([]);
    }
  };

  // Determine if all selectable users are checked
  const isAllSelected = 
    users.length > 1 &&
    users.filter((u) => u.id !== profile?.uid).every((u) => selectedUserIds.includes(u.id));

  // Execute bulk deletion using high-performance Firestore write batch
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
      alert(`Successfully deleted ${selectedUserIds.length} user accounts.`);
    } catch (error) {
      console.error("Failed to bulk delete users:", error);
      alert("Failed to execute bulk deletion: " + error.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        User Management
      </h1>

      {/* 3. Dynamic Bulk Action Bar */}
      {selectedUserIds.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between transition-all duration-200">
          <span className="text-sm text-red-700 font-semibold">
            {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={deleteSelectedUsers}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors shadow-sm"
          >
            Bulk Delete Selected Users
          </button>
        </div>
      )}

      <table className="w-full border">
        <thead>
          <tr>
            {/* 2. Leftmost Column - Master Checkbox */}
            <th className="border p-2 text-center w-12 bg-zinc-50 dark:bg-zinc-900">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                className="cursor-pointer"
                title="Select all except yourself"
              />
            </th>
            <th className="border p-2 text-left">Name</th>
            <th className="border p-2 text-left">Email</th>
            <th className="border p-2 text-left">Role</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => {
            const isSelf = u.id === profile?.uid;

            return (
              <tr key={u.id} className={isSelf ? "bg-zinc-50/50 dark:bg-zinc-900/30" : ""}>
                {/* 2. Row Checkbox (Disabled for current Super Admin) */}
                <td className="border p-2 text-center">
                  {!isSelf ? (
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={() => handleSelectRow(u.id)}
                      className="cursor-pointer"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      disabled
                      className="cursor-not-allowed opacity-50"
                      title="Self-deletion is restricted."
                    />
                  )}
                </td>

                <td className="border p-2">
                  {u.displayName} {isSelf && <span className="text-xs text-zinc-400 font-medium ml-1">(You)</span>}
                </td>

                <td className="border p-2">
                  {u.email}
                </td>

                <td className="border p-2">
                  {u.role}
                </td>

                <td className="border p-2 flex gap-2 flex-wrap items-center">
                  {u.role === 'spectator' && (
                    <button
                      className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                      onClick={() =>
                        updateRole(u.id, 'dojo_admin')
                      }
                    >
                      Promote to Dojo Admin
                    </button>
                  )}

                  {u.role === 'dojo_admin' && (
                    <>
                      <button
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        onClick={() =>
                          updateRole(
                            u.id,
                            'tournament_organizer'
                          )
                        }
                      >
                        Promote Organizer
                      </button>

                      <button
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                        onClick={() =>
                          updateRole(u.id, 'spectator')
                        }
                      >
                        Demote
                      </button>
                    </>
                  )}

                  {u.role === 'tournament_organizer' && (
                    <button
                      className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
                      onClick={() =>
                        updateRole(
                          u.id,
                          'dojo_admin'
                        )
                      }
                    >
                      Demote to Dojo Admin
                    </button>
                  )}

                  {/* Individual Deletion Action */}
                  {isSelf ? (
                    <button
                      className="px-2 py-1 bg-gray-350 text-gray-500 rounded cursor-not-allowed"
                      disabled
                      title="Self-deletion is structurally restricted on this session."
                    >
                      Delete User
                    </button>
                  ) : (
                    <button
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      onClick={() => deleteUser(u.id)}
                    >
                      Delete User
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}