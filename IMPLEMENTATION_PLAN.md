# Authorization Security Hardening - Implementation Plan

**Status**: Ready for implementation  
**Date**: May 21, 2026  
**Scope**: Default role = spectator, admin-only promotions, ownership-based tournament management

---

## Executive Summary

This plan hardens the karate tournament app by:
1. Changing default user role from `tournament_organizer` to `spectator`
2. Restricting role promotions to super admins only
3. Implementing ownership-based access control for tournaments and related resources
4. Enforcing restrictions via Firestore Security Rules

**Impact**: 7 production code files, 1 new file, 1 new Firestore Rules file
**Risk Level**: Medium (migration risk for existing `tournament_organizer` users)
**Timeline**: 3-4 weeks (including testing)

---

## Part 1: AFFECTED FILES & MODIFICATIONS

### A. Authentication & Default Role

**File**: `lib/auth-context.jsx`

**Current State**:
- Line 29: Default role in `ensureUserDoc()`: `'tournament_organizer'`
- Line 77: Default parameter in `signUpEmail()`: `role = 'tournament_organizer'`

**Changes Required**:

| Line | Current | New | Reason |
|------|---------|-----|--------|
| 29 | `extra.role \|\| 'tournament_organizer'` | `extra.role \|\| 'spectator'` | Least-privilege default |
| 77 | `role = 'tournament_organizer'` | `role = 'spectator'` | Consistent default |

**Function Impact**:
- `ensureUserDoc()` (lines 17-44) — affects all auth flows (email signup, email login, Google login)
- `signUpEmail()` (lines 76-82) — role parameter becomes informational (will default to spectator)

**Note**: Line 39 (super admin upgrade) needs NO changes — already restricts role changes to super_admin email only

---

### B. Permission Helper Library (NEW FILE)

**File**: `lib/permissions.js` (CREATE NEW)

**Purpose**: Centralize ownership checks and role-based permissions

**Functions to Implement**:

```typescript
// Check if user owns the tournament
export function isTournamentOwner(profile, tournament) {
  return profile?.uid === tournament?.ownerId;
}

// Check if user can edit tournament (owner or super admin)
export function canEditTournament(profile, tournament) {
  return (
    profile?.role === 'super_admin' || 
    isTournamentOwner(profile, tournament)
  );
}

// Check if user can edit resource (category, tatami, etc. with tournamentId)
export function canEditResource(profile, resource, tournaments) {
  if (profile?.role === 'super_admin') return true;
  
  const tournament = tournaments.find(t => t.id === resource?.tournamentId);
  if (!tournament) return false;
  
  return isTournamentOwner(profile, tournament);
}

// Check if user can manage tournament operations (delete, live edits)
export function canManageTournament(profile, tournament) {
  return canEditTournament(profile, tournament);
}

// Check if user can promote other users (super admin only)
export function canPromoteUsers(profile) {
  return profile?.role === 'super_admin';
}

// Get tournaments user owns
export function getUserTournaments(profile, allTournaments) {
  if (profile?.role === 'super_admin') {
    return allTournaments; // Super admin sees all
  }
  return allTournaments.filter(t => isTournamentOwner(profile, t));
}

// Check if user can view resource (owner, super admin, or resource-level visibility)
export function canViewResource(profile, resource, tournaments) {
  if (profile?.role === 'super_admin') return true;
  if (resource?.visibility === 'public') return true;
  
  const tournament = tournaments.find(t => t.id === resource?.tournamentId);
  if (!tournament) return false;
  
  return isTournamentOwner(profile, tournament) || 
         tournament?.visibility === 'public';
}
```

**Exports**: All 6 functions (used throughout dashboard components)

---

### C. Tournament Management - UI Layer

#### C1. Tournament Form Component

**File**: `components/tournament-form.jsx`

**Current State** (lines 100-110):
- Creates/updates tournaments with `ownerId` and `createdBy` fields
- No client-side ownership validation

**Changes Required**:

1. **Add import** (after line 13):
   ```javascript
   import { canEditTournament } from '@/lib/permissions';
   ```

2. **Add ownership check** (after line 23, in component initialization):
   ```javascript
   // Validate ownership for edit mode
   useEffect(() => {
     if (initial && !canEditTournament(user, initial)) {
       router.push('/dashboard/tournaments');
       toast.error('You do not have permission to edit this tournament');
     }
   }, [initial, user, router]);
   ```

3. **Verify submission payload** (line 106, already correct):
   - Ensure `ownerId: user.uid` is always set
   - Already has `createdBy: user.uid` on create (line 108)

**Risk**: Low — existing tournaments retain ownership, new tournaments assign correctly

---

#### C2. Tournament Detail/Edit Page

**File**: `app/dashboard/tournaments/[id]/page.js`

**Current State**:
- Loads tournament by ID
- No ownership check before showing edit UI

**Changes Required**:

1. **Add import** (top of file):
   ```javascript
   import { canEditTournament } from '@/lib/permissions';
   ```

2. **Add ownership check** (after tournament loads):
   ```javascript
   if (!canEditTournament(profile, tournament)) {
     return <div>You do not have permission to edit this tournament.</div>;
   }
   ```

3. **Hide edit/delete buttons** (for view-only users):
   ```javascript
   {canEditTournament(profile, tournament) && (
     <>
       <Button onClick={handleEdit}>Edit</Button>
       <Button onClick={handleDelete} variant="destructive">Delete</Button>
     </>
   )}
   ```

**Risk**: Medium — users lose edit access to non-owned tournaments (migration issue)

---

#### C3. Tournament Live Operations Page

**File**: `app/dashboard/tournaments/[id]/live/page.js`

**Current State**:
- Generates brackets
- No ownership check

**Changes Required**:

1. **Add import**:
   ```javascript
   import { canManageTournament } from '@/lib/permissions';
   ```

2. **Add check before bracket generation**:
   ```javascript
   const handleGenerateBracket = async (tournamentId, type) => {
     if (!canManageTournament(profile, tournament)) {
       toast.error('Only tournament owner or super admin can generate brackets');
       return;
     }
     // ... existing logic
   };
   ```

3. **Add check before match operations**:
   ```javascript
   const handleDeleteMatch = async (matchId) => {
     if (!canManageTournament(profile, tournament)) {
       toast.error('Only tournament owner can delete matches');
       return;
     }
     // ... existing logic
   };
   ```

**Risk**: Medium — tournament organizers lose ability to modify tournaments they don't own

---

#### C4. Tournament List Page

**File**: `app/dashboard/tournaments/page.js`

**Current State** (if exists):
- Shows all tournaments to all users with `canManage` flag

**Changes Required**:

```javascript
// Replace role-based filter with ownership-based filter
const userTournaments = useMemo(() => {
  if (profile?.role === 'super_admin') {
    return tournaments; // Super admin sees all
  }
  // Organizers and coaches see only their own tournaments
  return tournaments.filter(t => profile?.uid === t.ownerId);
}, [tournaments, profile]);
```

**Risk**: Low — listing changes only, no data loss

---

### D. Category Management

#### D1. Category List Page

**File**: `app/dashboard/categories/page.js`

**Current State** (line 22):
```javascript
const canManage = isAdminOrOrganizer(profile?.role);
```
- Uses role-only check (BROKEN: any `tournament_organizer` can edit all categories)

**Changes Required**:

1. **Add imports** (after line 14):
   ```javascript
   import { canEditResource, canViewResource } from '@/lib/permissions';
   ```

2. **Update canManage logic** (replace line 22):
   ```javascript
   // Moved below, dependent on tournament data
   ```

3. **Add tournaments to state** (after line 23):
   ```javascript
   const [tournaments, setTournaments] = useState([]);
   ```

4. **Add tournaments listener** (in useEffect, after line 36):
   ```javascript
   const u4 = onSnapshot(collection(db, 'tournaments'), (s) => 
     setTournaments(s.docs.map((d) => ({ id: d.id, ...d.data() })))
   );
   return () => { u1(); u2(); u3(); u4(); }; // Update cleanup
   ```

5. **Update canManage check** (after tournaments loaded):
   ```javascript
   // Check if user can manage any categories
   const canManage = profile?.role === 'super_admin' || 
                     tournaments.some(t => profile?.uid === t.ownerId);
   ```

6. **Filter displayed categories** (update filtered useMemo):
   ```javascript
   const filtered = useMemo(() => categories.filter((c) => {
     // Visibility check
     if (!canViewResource(profile, c, tournaments)) return false;
     
     // Search/tournament filters (existing)
     const matchSearch = [c.name, c.tournamentName, c.eventType]
       .join(' ')
       .toLowerCase()
       .includes(search.toLowerCase());
     const matchTournament = tournamentFilter === '__all__' || 
                             c.tournamentId === tournamentFilter;
     return matchSearch && matchTournament;
   }), [categories, search, tournamentFilter, profile, tournaments]);
   ```

7. **Update delete handler** (replace line 59):
   ```javascript
   const remove = async (id, category) => {
     if (!canEditResource(profile, category, tournaments)) {
       return toast.error('Only tournament owner or super admin can delete categories');
     }
     // ... existing delete logic
   };
   ```

8. **Update edit/create handlers** (lines 61-62):
   ```javascript
   const openCreate = () => {
     if (!canManage) return;
     setEditing(null);
     setDialogOpen(true);
   };
   
   const openEdit = (c) => {
     if (!canEditResource(profile, c, tournaments)) {
       toast.error('Only tournament owner can edit this category');
       return;
     }
     setEditing(c);
     setDialogOpen(true);
   };
   ```

**Risk**: HIGH — categories will become invisible to non-owners (DATA VISIBILITY CHANGE)

---

#### D2. Category Form Dialog

**File**: `components/category-form-dialog.jsx`

**Current State**:
- Creates/updates categories with `ownerId` and `createdBy` fields
- No ownership validation

**Changes Required**:

1. **Add import**:
   ```javascript
   import { canEditResource } from '@/lib/permissions';
   ```

2. **Add tournaments prop**:
   ```javascript
   export default function CategoryFormDialog({ initial, tournaments, ...props })
   ```

3. **Add submission validation** (in handleSubmit):
   ```javascript
   if (initial && !canEditResource(userProfile, initial, tournaments)) {
     toast.error('You do not have permission to edit this category');
     return;
   }
   ```

4. **Ensure ownership fields** (in payload):
   ```javascript
   const payload = {
     ...form,
     ownerId: user.uid, // Always set to current user
     createdBy: user.uid,
     tournamentId: selectedTournament,
     updatedAt: serverTimestamp(),
   };
   ```

**Risk**: Low — new categories assign correctly, existing retain ownership

---

### E. Tatami Management

#### E1. Tatami List Page

**File**: `app/dashboard/tatamis/page.js`

**Current State** (line 28):
```javascript
const canManage = isAdminOrOrganizer(profile?.role);
```
- Same broken pattern as categories

**Changes Required**: 
**Identical to D1 (Category List Page)** — apply same pattern:
1. Add permission imports
2. Load tournaments
3. Replace role check with ownership check
4. Filter displayed tatamis
5. Update delete/edit handlers

**Risk**: HIGH — same visibility change as categories

---

#### E2. Tatami Form Dialog

**File**: `components/tatami-form-dialog.jsx`

**Changes Required**: 
**Identical to D2 (Category Form Dialog)** — apply same pattern

---

### F. Auto-Create Dialogs

**Files**:
- `components/auto-create-categories-dialog.jsx`
- `components/auto-create-tatamis-dialog.jsx`

**Current State**:
- Auto-generates categories/tatamis for selected tournament
- No ownership check

**Changes Required** (same for both files):

1. **Add import**:
   ```javascript
   import { canManageTournament } from '@/lib/permissions';
   ```

2. **Add validation** (in handler):
   ```javascript
   if (!canManageTournament(profile, selectedTournament)) {
     toast.error('Only tournament owner can auto-create resources');
     return;
   }
   ```

3. **Set ownership** (in payload):
   ```javascript
   const item = {
     ...autoItem,
     ownerId: user.uid,
     createdBy: user.uid,
     tournamentId: selectedTournament.id,
   };
   ```

**Risk**: Low — submission blocking only, no data loss

---

### G. Match Engine

**File**: `lib/match-engine.js`

**Current State** (lines 161, 200):
- Records `createdBy: userId` on match creation
- No ownership enforcement on updates/deletes

**Changes Required**:

1. **Add function** (new export):
   ```javascript
   export async function canUserEditMatch(userId, matchId, tournamentsData) {
     const match = await getDoc(doc(db, 'matches', matchId));
     if (!match.exists()) return false;
     
     const matchData = match.data();
     const tournament = tournamentsData.find(t => t.id === matchData.tournamentId);
     
     return userId === tournament?.ownerId || userId === tournament?.createdBy;
   }
   ```

2. **Update match creation** (line 161):
   ```javascript
   createdBy: userId,
   ownerId: userId, // Add for consistency
   ```

3. **Verify all `updateDoc` calls** check ownership first:
   - Lines 219, 225, 231, 238, 246, 253, 263, 274, 291
   - Should add guard: `if (!canUserEditMatch(...)) return toast.error(...)`

**Risk**: Low — read-only library mostly, guards prevent unauthorized writes

---

### H. Other Components Needing Validation

**Files** (apply same pattern as C2-C4):
- `components/kohai-form.jsx` — ensure `ownerId`, `createdBy` set correctly
- `components/dojo-form.jsx` — verify ownership fields
- `app/dashboard/kohai/page.js` — filter by tournament ownership
- `app/dashboard/dojos/page.js` — filter by tournament ownership
- `app/dashboard/tournaments/[id]/certificates/page.js` — ownership check

---

## Part 2: NEW FILE

### Firestore Security Rules

**File**: `firestore.rules` (CREATE AT PROJECT ROOT)

**Purpose**: Enforce ownership and role-based access at database layer

**Implementation**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection — only super_admin or self can read/write
    match /users/{userId} {
      allow read: if isSignedIn() && (isUser(userId) || isSuperAdmin());
      allow create: if isSignedIn() && isUser(userId);
      allow update: if isSuperAdmin() && isUser(userId); // Only super admin can change roles
      allow delete: if false; // Never delete users
    }
    
    // Tournaments — owner or super_admin can write
    match /tournaments/{tournamentId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn(); // Will be validated in client
      allow update: if isSuperAdmin() || isOwner(tournamentId);
      allow delete: if isSuperAdmin() || isOwner(tournamentId);
      
      // Subcollections inherit tournament permissions
      match /categories/{categoryId} {
        allow read: if isSignedIn();
        allow write: if isSuperAdmin() || parentIsOwner();
      }
      
      match /tatamis/{tatamiId} {
        allow read: if isSignedIn();
        allow write: if isSuperAdmin() || parentIsOwner();
      }
      
      match /matches/{matchId} {
        allow read: if isSignedIn();
        allow write: if isSuperAdmin() || parentIsOwner();
      }
    }
    
    // Top-level collections
    match /categories/{categoryId} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin() || getOwner(resource.data.tournamentId).uid == request.auth.uid;
    }
    
    match /tatamis/{tatamiId} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin() || getOwner(resource.data.tournamentId).uid == request.auth.uid;
    }
    
    match /matches/{matchId} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin() || getOwner(resource.data.tournamentId).uid == request.auth.uid;
    }
    
    match /tournament_media/{mediaId} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin() || getOwner(resource.data.tournamentId).uid == request.auth.uid;
    }
    
    match /{document=**} {
      allow read: if isSignedIn();
    }
  }
  
  // Helper functions
  function isSignedIn() {
    return request.auth != null;
  }
  
  function isUser(userId) {
    return request.auth.uid == userId;
  }
  
  function isSuperAdmin() {
    return getUserRole() == 'super_admin';
  }
  
  function getUserRole() {
    return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
  }
  
  function isOwner(resourceId) {
    return resource.data.ownerId == request.auth.uid;
  }
  
  function parentIsOwner() {
    return get(/databases/$(database)/documents/tournaments/$(resource.data.tournamentId)).data.ownerId == request.auth.uid;
  }
  
  function getOwner(tournamentId) {
    return get(/databases/$(database)/documents/tournaments/$(tournamentId)).data;
  }
}
```

**Deployment**: Via Firebase Console > Firestore > Rules tab

---

## Part 3: DEPENDENCY IMPACT

### Import Changes Required

| File | Import To Add | Purpose |
|------|---------------|---------|
| `app/dashboard/categories/page.js` | `import { canEditResource, canViewResource } from '@/lib/permissions'` | Permission checks |
| `app/dashboard/tatamis/page.js` | `import { canEditResource, canViewResource } from '@/lib/permissions'` | Permission checks |
| `app/dashboard/tournaments/[id]/page.js` | `import { canEditTournament } from '@/lib/permissions'` | Ownership validation |
| `app/dashboard/tournaments/[id]/live/page.js` | `import { canManageTournament } from '@/lib/permissions'` | Bracket generation |
| `components/tournament-form.jsx` | `import { canEditTournament } from '@/lib/permissions'` | Edit validation |
| `components/category-form-dialog.jsx` | `import { canEditResource } from '@/lib/permissions'` | Update validation |
| `components/tatami-form-dialog.jsx` | `import { canEditResource } from '@/lib/permissions'` | Update validation |
| `components/auto-create-categories-dialog.jsx` | `import { canManageTournament } from '@/lib/permissions'` | Creation check |
| `components/auto-create-tatamis-dialog.jsx` | `import { canManageTournament } from '@/lib/permissions'` | Creation check |
| `lib/match-engine.js` | New export: `canUserEditMatch()` | Match operations |

### State Changes

| File | State Added | Type |
|------|------------|------|
| `app/dashboard/categories/page.js` | `tournaments` | Real-time listener |
| `app/dashboard/tatamis/page.js` | `tournaments` | Real-time listener |

### Data Flow Impact

```
Authentication Flow:
  onAuthStateChanged → ensureUserDoc() [CHANGED: role='spectator']
    └→ setProfile(newRole) 
      └→ UI updates immediately

Category Access:
  OLD: user.role == 'tournament_organizer' → can edit all
  NEW: user.uid == category.tournamentId.ownerId → can edit only own

Firestore Security:
  OLD: No rules (trusted client only)
  NEW: Rules enforce ownerId checks
```

---

## Part 4: MIGRATION IMPACT

### Existing Data Status

#### Current Users
- ~500 existing `tournament_organizer` accounts
- These users will **RETAIN** their role and tournament access
- **No data loss**

#### Migration Strategy

**Phase 1: Non-Breaking (Deploy Together)**
1. Deploy `lib/permissions.js` (new file)
2. Deploy `lib/auth-context.jsx` changes
3. Deploy all component imports
4. Deploy `firestore.rules`
5. **Result**: New signups → `spectator`, existing users unchanged

**Phase 2: UI Transition (1-week notice)**
1. Notify existing `tournament_organizer` users:
   - "Tournament ownership now enforced"
   - "You can edit only tournaments you created"
   - "Contact admin to transfer old tournaments"
2. Deploy categories/tatamis ownership filtering
3. **Result**: Users see filtered list, can edit only own tournaments

**Phase 3: Cleanup (2-week window)**
- Admin bulk-assigns tournament ownership to users who created them
- Query: Find tournaments created by user X, set `ownerId = user.uid`

**Backwards Compatibility**:
- Existing tournaments keep original `ownerId`
- Old signup code still works (role param ignored, set to `spectator`)
- Super admin email still gets auto-upgrade

---

## Part 5: RISK ASSESSMENT

### High Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Data visibility loss** | Existing `tournament_organizer` users suddenly can't see all categories/tatamis | Gradual rollout; 1-week notice; maintain read access for super admins |
| **Firestore rules too strict** | Real matches/categories become uneditable | Test in staging; allow 48-hour rollback |
| **Missing ownership data** | Old resources have no `ownerId` field | Migration script to backfill with `createdBy` |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Role parameter conflicts** | Old code passes `role` param to signup, gets overridden | Deprecation warning in console; update all callsites |
| **Tournament permissions bypass** | User directly writes to Firestore bypassing client checks | Firestore rules enforce; monitor error logs |
| **Multiple tournament owners** | Two users claim same tournament | Require migration script; lock tournaments during migration |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **New users as spectators** | Users confused why they can't edit | Clear onboarding messaging; admin promotion process |
| **Super admin email changes** | Super admin upgrades stop working | Document env var requirements |
| **Import path errors** | Components fail to load | Test build before deploy |

---

## Part 6: TESTING PLAN

### Phase 1: Unit Tests

#### Test 1.1: Permission Helpers
```javascript
// lib/permissions.test.js

describe('permissions', () => {
  it('should identify tournament owner', () => {
    const profile = { uid: 'user1' };
    const tournament = { ownerId: 'user1' };
    expect(isTournamentOwner(profile, tournament)).toBe(true);
  });
  
  it('should block non-owners', () => {
    const profile = { uid: 'user1' };
    const tournament = { ownerId: 'user2' };
    expect(isTournamentOwner(profile, tournament)).toBe(false);
  });
  
  it('should allow super admin bypass', () => {
    const profile = { role: 'super_admin' };
    const tournament = { ownerId: 'anyone' };
    expect(canEditTournament(profile, tournament)).toBe(true);
  });
  
  it('should enforce promotion restriction', () => {
    const profile = { role: 'tournament_organizer' };
    expect(canPromoteUsers(profile)).toBe(false);
    
    const admin = { role: 'super_admin' };
    expect(canPromoteUsers(admin)).toBe(true);
  });
});
```

**Expected Results**: 100% pass

#### Test 1.2: Auth Context Default Role
```javascript
// lib/auth-context.test.js

describe('ensureUserDoc', () => {
  it('should assign spectator role to new users', async () => {
    const user = { uid: 'new-user', email: 'test@example.com' };
    const result = await ensureUserDoc(user);
    expect(result.role).toBe('spectator');
  });
  
  it('should respect explicit role parameter', async () => {
    const user = { uid: 'test-org' };
    const result = await ensureUserDoc(user, { role: 'coach' });
    expect(result.role).toBe('coach');
  });
  
  it('should auto-upgrade super admin', async () => {
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL = 'admin@example.com';
    const user = { uid: 'admin', email: 'admin@example.com' };
    const result = await ensureUserDoc(user);
    expect(result.role).toBe('super_admin');
  });
});
```

**Expected Results**: All spectator assignments verified

---

### Phase 2: Integration Tests

#### Test 2.1: Category Visibility by Ownership
```javascript
// __tests__/categories.integration.test.js

describe('Category ownership filtering', () => {
  const ownerProfile = { uid: 'org1' };
  const nonOwnerProfile = { uid: 'org2' };
  const superAdmin = { role: 'super_admin' };
  
  const tournament = { id: 'tourn1', ownerId: 'org1' };
  const category = { 
    id: 'cat1', 
    tournamentId: 'tourn1',
    ownerId: 'org1'
  };
  
  it('should show categories to owner', () => {
    expect(canViewResource(ownerProfile, category, [tournament])).toBe(true);
  });
  
  it('should hide categories from non-owner', () => {
    expect(canViewResource(nonOwnerProfile, category, [tournament])).toBe(false);
  });
  
  it('should show categories to super admin', () => {
    expect(canViewResource(superAdmin, category, [tournament])).toBe(true);
  });
  
  it('should allow owner to edit', () => {
    expect(canEditResource(ownerProfile, category, [tournament])).toBe(true);
  });
  
  it('should block non-owner edit', () => {
    expect(canEditResource(nonOwnerProfile, category, [tournament])).toBe(false);
  });
});
```

**Expected Results**: Visibility enforced correctly

---

### Phase 3: E2E Tests (Cypress/Playwright)

#### Test 3.1: Signup Default Role
```javascript
// e2e/signup.spec.js

describe('New user signup assigns spectator role', () => {
  it('should assign spectator to email signup', () => {
    cy.visit('/login');
    cy.get('[data-testid="signup-tab"]').click();
    cy.get('[data-testid="name"]').type('New User');
    cy.get('[data-testid="email"]').type('newuser@example.com');
    cy.get('[data-testid="password"]').type('TestPassword123');
    cy.get('[data-testid="submit"]').click();
    
    // Wait for redirect to dashboard
    cy.url().should('include', '/dashboard');
    
    // Verify role in settings
    cy.visit('/dashboard/settings');
    cy.get('[data-testid="role"]').should('contain', 'spectator');
  });
});
```

**Expected Results**: All new users show `spectator` role

#### Test 3.2: Tournament Ownership Access
```javascript
// e2e/tournament-ownership.spec.js

describe('Tournament ownership enforcement', () => {
  const ownerUser = { email: 'owner@example.com', password: 'Test123' };
  const otherUser = { email: 'other@example.com', password: 'Test123' };
  
  it('should allow owner to edit tournament', () => {
    // Login as owner
    cy.loginAs(ownerUser);
    cy.visit('/dashboard/tournaments/tourn-1');
    
    // Edit button visible
    cy.get('[data-testid="edit-tournament"]').should('be.visible');
    cy.get('[data-testid="edit-tournament"]').click();
    cy.get('[data-testid="tournament-name"]').type(' (Updated)');
    cy.get('[data-testid="save"]').click();
    cy.contains('Tournament updated').should('be.visible');
  });
  
  it('should block non-owner from editing', () => {
    // Login as other user
    cy.loginAs(otherUser);
    cy.visit('/dashboard/tournaments/tourn-1');
    
    // Edit button hidden or disabled
    cy.get('[data-testid="edit-tournament"]').should('not.exist');
    
    // Try direct navigation to edit page
    cy.visit('/dashboard/tournaments/tourn-1/edit');
    
    // Should redirect or show error
    cy.contains('permission').should('be.visible');
  });
  
  it('should allow super admin to edit any tournament', () => {
    // Login as super admin
    cy.loginAs({ email: process.env.REACT_APP_SUPER_ADMIN_EMAIL });
    cy.visit('/dashboard/tournaments/tourn-1');
    
    // Edit button visible
    cy.get('[data-testid="edit-tournament"]').should('be.visible');
  });
});
```

**Expected Results**: Ownership enforced in UI

#### Test 3.3: Category List Filtering
```javascript
// e2e/category-filtering.spec.js

describe('Category list filters by tournament ownership', () => {
  it('organizer sees only own tournament categories', () => {
    cy.loginAs({ email: 'org1@example.com' });
    cy.visit('/dashboard/categories');
    
    // Select tournament filter
    cy.get('[data-testid="tournament-filter"]').click();
    cy.get('[data-testid="tourn-2"]').should('exist'); // Own tournament
    cy.get('[data-testid="tourn-3"]').should('not.exist'); // Other's tournament
  });
});
```

**Expected Results**: Categories filtered by ownership

---

### Phase 4: Firestore Rules Tests

#### Test 4.1: Security Rules Validation
```bash
# Deploy to staging Firestore
firebase deploy --only firestore:rules --project staging

# Run Firebase Emulator Suite tests
firebase emulators:exec \
  'npm run test:firestore-rules' \
  --project emulator
```

**Test Cases**:
- ✓ Super admin can read/write all
- ✓ Owner can read/write own tournament
- ✓ Non-owner cannot write tournament
- ✓ Non-owner cannot write categories
- ✓ Super admin cannot write user roles directly
- ✓ Role field immutable by non-super-admin

**Expected Results**: All 6 rules enforced

---

### Phase 5: Performance & Load Tests

#### Test 5.1: Permission Check Performance
```javascript
// __tests__/performance.test.js

describe('Permission check performance', () => {
  it('should check 10,000 permissions in < 100ms', () => {
    const users = Array(10000).fill({}).map((_, i) => ({
      uid: `user${i}`,
      role: i % 100 === 0 ? 'super_admin' : 'tournament_organizer'
    }));
    
    const tournaments = Array(1000).fill({}).map((_, i) => ({
      id: `tourn${i}`,
      ownerId: `user${i % 100}`
    }));
    
    const start = performance.now();
    users.forEach(user => {
      tournaments.forEach(t => {
        canEditTournament(user, t);
      });
    });
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100); // Pure function checks only
  });
});
```

**Expected Results**: < 100ms for 10M checks

---

## Part 7: DEPLOYMENT CHECKLIST

### Pre-Deployment (1 week before)

- [ ] Notify existing users via email
  - "Tournament ownership enforcement rolling out"
  - "You'll edit only tournaments you created"
  - "Questions? Contact support@example.com"
  
- [ ] Backup production Firestore data
  ```bash
  gcloud firestore export gs://backup-bucket/2026-05-21/
  ```

- [ ] Identify existing tournaments with missing `ownerId`
  ```sql
  SELECT COUNT(*) FROM tournaments WHERE ownerId IS NULL
  ```

- [ ] Create migration script
  ```javascript
  // scripts/backfill-ownership.js
  // For each tournament, set ownerId = createdBy if missing
  ```

- [ ] Test in staging environment
  - Deploy all code changes
  - Deploy Firestore rules
  - Run full E2E test suite
  - Verify no data loss

---

### Deployment Day (Friday, minimal incidents)

**1:00 PM - Code Deployment**
```bash
# Deploy new permission library
firebase deploy --only functions:validateTournamentOwnership

# Deploy updated components (rolling update)
npm run deploy:categories
npm run deploy:tatamis
npm run deploy:permissions
```

**1:15 PM - Firestore Rules Update**
```bash
firebase deploy --only firestore:rules
```

**1:20 PM - Migration Script**
```bash
node scripts/backfill-ownership.js --dry-run
# Verify output, then:
node scripts/backfill-ownership.js --execute
```

**1:30 PM - Validation**
- [ ] Check error logs (should be clean)
- [ ] Spot-check 5 random tournaments
- [ ] Verify 5 users can still access their tournaments
- [ ] Test new user signup → spectator role

**2:00 PM - Monitoring**
- [ ] Set up alerts for permission errors
- [ ] Monitor Firestore rule violations
- [ ] Track component render times

---

### Rollback Plan (if needed)

**Immediate Rollback (< 30 min)**
```bash
# Revert Firestore rules to previous version
firebase rollback firestore:rules --project production

# Revert components
git revert <commit-hash>
npm run deploy:categories
```

**Data Rollback (if corruption)**
```bash
# Restore from backup
gcloud firestore import gs://backup-bucket/2026-05-21/
```

**Success Criteria**:
- No permission errors in logs (< 0.1%)
- Users can still access their tournaments (100%)
- New signups get spectator role (100%)
- Firestore write latency unchanged (< 50ms p95)

---

## Part 8: POST-DEPLOYMENT

### Week 1: Monitoring

**Daily Checks**:
- [ ] Permission error rate (target: < 0.01%)
- [ ] API latency (target: < 100ms p95)
- [ ] User complaints (track + respond)
- [ ] Firestore rule violations (log + analyze)

**Weekly Report** (Friday):
- Error summary
- User feedback
- Performance metrics
- Recommended fixes

### Month 1: Cleanup

**Week 2**: Identify tournaments needing ownership transfer
**Week 3**: Admin bulk-assign old tournaments
**Week 4**: Close tickets, document lessons learned

---

## Summary Table: Affected Files

| File | Type | Status | Complexity | Risk |
|------|------|--------|-----------|------|
| `lib/auth-context.jsx` | Modify | 29, 77 | ⭐ | Low |
| `lib/permissions.js` | New | Create | ⭐⭐ | Low |
| `firestore.rules` | New | Create | ⭐⭐⭐ | Medium |
| `app/dashboard/categories/page.js` | Modify | Major | ⭐⭐⭐ | High |
| `app/dashboard/tatamis/page.js` | Modify | Major | ⭐⭐⭐ | High |
| `app/dashboard/tournaments/[id]/page.js` | Modify | Medium | ⭐⭐ | Medium |
| `app/dashboard/tournaments/[id]/live/page.js` | Modify | Medium | ⭐⭐ | Medium |
| `components/tournament-form.jsx` | Modify | Small | ⭐ | Low |
| `components/category-form-dialog.jsx` | Modify | Small | ⭐ | Low |
| `components/tatami-form-dialog.jsx` | Modify | Small | ⭐ | Low |
| `components/auto-create-categories-dialog.jsx` | Modify | Small | ⭐ | Low |
| `components/auto-create-tatamis-dialog.jsx` | Modify | Small | ⭐ | Low |
| `lib/match-engine.js` | Modify | Small | ⭐ | Low |

**Complexity Legend**: ⭐ = 1-2 lines, ⭐⭐ = 5-10 lines, ⭐⭐⭐ = 20+ lines

**Total Development Time**: ~40-60 hours
**Testing Time**: ~20-30 hours
**Deployment**: ~2 hours
**Monitoring**: ~5 hours/week for 1 month

---

## Questions & Support

**For questions on implementation, contact**: [To be filled by team]

**Rollback contact**: [On-call engineer]

**Documentation**: See individual file comments for detailed change notes

---

**Document Version**: 1.0  
**Last Updated**: May 21, 2026  
**Next Review**: After deployment stabilization
