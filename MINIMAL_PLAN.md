# Minimal Authorization Implementation Plan

**Goal**: New users → spectator. Tournament creators edit only own tournaments. Others view-only. Super admin manages all.

---

## PART 1: EXACT FILES & LOCATIONS

### File 1: `lib/auth-context.jsx`

**Change 1 — Line 29**: Default role for new users
```javascript
// BEFORE:
extra.role || 'tournament_organizer'

// AFTER:
extra.role || 'spectator'
```

**Change 2 — Line 77**: Default parameter
```javascript
// BEFORE:
async signUpEmail(email, password, displayName, role = 'tournament_organizer') {

// AFTER:
async signUpEmail(email, password, displayName, role = 'spectator') {
```

---

### File 2: `lib/permissions.js` (CREATE NEW)

```javascript
// Check if user owns tournament
export function isTournamentOwner(userId, tournament) {
  return userId === tournament?.ownerId;
}

// Check if user can edit tournament
export function canEditTournament(userId, userRole, tournament) {
  if (userRole === 'super_admin') return true;
  return isTournamentOwner(userId, tournament);
}

// Check if user can view/access tournament
export function canViewTournament(userId, userRole, tournament) {
  if (userRole === 'super_admin') return true;
  if (isTournamentOwner(userId, tournament)) return true;
  return userRole === 'tournament_organizer'; // View-only for organizers
}

// Check if user owns resource (category, tatami, etc.)
export function ownsResource(userId, resource) {
  return userId === resource?.ownerId;
}
```

---

### File 3: `app/dashboard/tournaments/[id]/page.js`

**Add at top** (after other imports):
```javascript
import { canEditTournament } from '@/lib/permissions';
```

**Add after tournament loads** (around line 40):
```javascript
// Check ownership before showing edit UI
if (tournament && !canEditTournament(profile?.uid, profile?.role, tournament)) {
  return <div className="p-4 text-red-600">You don't have permission to edit this tournament.</div>;
}
```

**Hide edit/delete buttons** (find where buttons render, add check):
```javascript
{canEditTournament(profile?.uid, profile?.role, tournament) && (
  <>
    <Button onClick={handleEdit}>Edit</Button>
    <Button onClick={handleDelete} variant="destructive">Delete</Button>
  </>
)}
```

---

### File 4: `components/tournament-form.jsx`

**Add at top**:
```javascript
import { canEditTournament } from '@/lib/permissions';
```

**Add in component** (after `initial` prop loaded):
```javascript
// Validate ownership for edits
if (initial && !canEditTournament(user?.uid, user?.role, initial)) {
  return <div>Permission denied</div>;
}
```

---

### File 5: `app/dashboard/tournaments/page.js`

**Find where tournaments render**. Add filter:
```javascript
// Show all tournaments to super admin, own tournaments to others
const visibleTournaments = profile?.role === 'super_admin' 
  ? tournaments 
  : tournaments.filter(t => profile?.uid === t.ownerId || profile?.role === 'tournament_organizer');
```

**For edit/delete buttons** (in tournament list rows):
```javascript
{profile?.uid === tournament.ownerId && (
  <>
    <Button size="sm" onClick={() => editTournament(tournament.id)}>Edit</Button>
    <Button size="sm" variant="destructive" onClick={() => deleteTournament(tournament.id)}>Delete</Button>
  </>
)}
```

---

### File 6: `firestore.rules`

**Create at project root**. Deploy via Firebase Console.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Tournaments
    match /tournaments/{tournamentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.ownerId || userIsSuperAdmin();
      allow delete: if request.auth.uid == resource.data.ownerId || userIsSuperAdmin();
    }
    
    // Categories inherit tournament ownership
    match /categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if isTournamentOwner(get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)));
    }
    
    // Tatamis inherit tournament ownership
    match /tatamis/{tatamiId} {
      allow read: if request.auth != null;
      allow write: if isTournamentOwner(get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)));
    }
    
    // Matches inherit tournament ownership
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow write: if isTournamentOwner(get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)));
    }
    
    // Other collections
    match /{document=**} {
      allow read: if request.auth != null;
    }
  }
  
  function userIsSuperAdmin() {
    return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
  }
  
  function isTournamentOwner(tournamentRef) {
    return request.auth.uid == tournamentRef.data.ownerId;
  }
}
```

---

## PART 2: IMPLEMENTATION ORDER

1. **Change 1**: `lib/auth-context.jsx` line 29 → spectator
2. **Change 2**: `lib/auth-context.jsx` line 77 → spectator
3. **Create**: `lib/permissions.js` with 4 functions
4. **Update**: `app/dashboard/tournaments/[id]/page.js` → add ownership check
5. **Update**: `components/tournament-form.jsx` → add ownership check
6. **Update**: `app/dashboard/tournaments/page.js` → filter + hide buttons
7. **Create**: `firestore.rules` → deploy to Firebase

---

## PART 3: MINIMAL TESTS

### Test 1: Default Role

```javascript
// lib/auth-context.test.js

test('new users get spectator role', async () => {
  const user = { uid: 'user1', email: 'new@example.com' };
  const result = await ensureUserDoc(user);
  expect(result.role).toBe('spectator');
});

test('super admin email auto-upgrades', async () => {
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = 'admin@example.com';
  const user = { uid: 'admin1', email: 'admin@example.com' };
  const result = await ensureUserDoc(user);
  expect(result.role).toBe('super_admin');
});
```

### Test 2: Ownership Check

```javascript
// lib/permissions.test.js

test('owner can edit tournament', () => {
  const user = { uid: 'user1' };
  const tournament = { ownerId: 'user1' };
  expect(canEditTournament('user1', 'tournament_organizer', tournament)).toBe(true);
});

test('non-owner cannot edit', () => {
  expect(canEditTournament('user2', 'tournament_organizer', { ownerId: 'user1' })).toBe(false);
});

test('super admin can always edit', () => {
  expect(canEditTournament('user2', 'super_admin', { ownerId: 'user1' })).toBe(true);
});

test('non-owner organizer can view', () => {
  expect(canViewTournament('user2', 'tournament_organizer', { ownerId: 'user1' })).toBe(true);
});

test('spectator cannot view non-owned tournament', () => {
  expect(canViewTournament('user2', 'spectator', { ownerId: 'user1' })).toBe(false);
});
```

### Test 3: UI Behavior (Manual/E2E)

```javascript
// Browser test - signup and verify role

1. Go to /login
2. Sign up as newuser@example.com
3. Go to /dashboard/settings
4. Verify role = "spectator"
5. Try to create a tournament
6. Verify "no permission" message appears

// Browser test - tournament access

1. Login as tournament_organizer_1 (create tournament T1)
2. Login as tournament_organizer_2 (different account)
3. View tournament T1
4. Try to click Edit button
5. Verify button is hidden or disabled
6. Manually navigate to /dashboard/tournaments/T1/edit
7. Verify "permission denied" message
```

### Test 4: Firestore Rules

```bash
# Deploy rules to emulator and test
firebase emulators:start

# In separate terminal, run tests
npm run test:firestore-rules

# Test cases:
# ✓ User can create tournament (sets ownerId)
# ✓ User can update own tournament
# ✓ User cannot update other's tournament
# ✓ Super admin can update any tournament
# ✓ User can read all tournaments
# ✓ Categories inherit permissions
```

---

## SUMMARY

| Change | File | Lines | Effort |
|--------|------|-------|--------|
| Default role | `lib/auth-context.jsx` | 29, 77 | 5 min |
| New file | `lib/permissions.js` | NEW | 15 min |
| Ownership check | `app/dashboard/tournaments/[id]/page.js` | +5 lines | 10 min |
| Ownership check | `components/tournament-form.jsx` | +3 lines | 5 min |
| Filter + UI | `app/dashboard/tournaments/page.js` | +8 lines | 15 min |
| Security rules | `firestore.rules` | NEW | 20 min |
| **Total Development** | | | **70 min** |
| **Testing** | | | **30-60 min** |

---

## VERIFICATION CHECKLIST

- [ ] New signup assigns `spectator` role
- [ ] Tournament creator can edit own tournament
- [ ] Other organizers cannot edit (button hidden)
- [ ] Super admin can edit any tournament
- [ ] Firestore rules block unauthorized writes
- [ ] All tests pass

---

## KNOWN LIMITATIONS (Intentionally Simple)

✗ Categories/tatamis not filtered by ownership (still role-based)  
✗ No migration for existing users  
✗ No notifications on role changes  
✗ No audit logs  
✗ No performance monitoring  

These can be added later if needed.
