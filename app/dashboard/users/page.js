'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

export default function UsersPage() {
  const { profile } = useAuth();

  const [users, setUsers] = useState([]);

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

  if (profile?.role !== 'super_admin') {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">
          Access Denied
        </h2>
      </div>
    );
  }

  const updateRole = async (userId, newRole) => {
    await updateDoc(doc(db, 'users', userId), {
      role: newRole,
      updatedAt: serverTimestamp(),
      updatedBy: profile.uid,
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        User Management
      </h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2 text-left">Name</th>
            <th className="border p-2 text-left">Email</th>
            <th className="border p-2 text-left">Role</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="border p-2">
                {u.displayName}
              </td>

              <td className="border p-2">
                {u.email}
              </td>

              <td className="border p-2">
                {u.role}
              </td>

              <td className="border p-2 flex gap-2 flex-wrap">
                {u.role === 'spectator' && (
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded"
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
                      className="px-2 py-1 bg-green-600 text-white rounded"
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
                      className="px-2 py-1 bg-red-500 text-white rounded"
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
                    className="px-2 py-1 bg-orange-500 text-white rounded"
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}