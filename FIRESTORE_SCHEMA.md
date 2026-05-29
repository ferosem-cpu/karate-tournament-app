# Firestore Database Schema - 5 New Modules

This document describes all new Firestore collections and schema additions from the 5-module implementation.

---

## Overview

The 5 modules introduce **3 new Firestore collections** and **1 schema addition** to existing collections:

| Collection | Purpose | Module |
|-----------|---------|--------|
| `tournament_registrations` | Batch athlete registration submissions | Module 1 |
| `role_requests` | Spectator role change requests | Module 2 |
| `referee_applications` | Referee certification applications | Module 4 |
| `users` (modified) | Added `organizerLicense` field | Module 3 |

---

## 1. tournament_registrations Collection

**Purpose:** Tracks batch athlete registrations submitted by dojo admins for tournament approval by organizers.

**Location in Firestore:** `tournament_registrations/`

### Document Structure

```javascript
{
  // Auto-generated document ID
  id: "reg_abc123xyz",
  
  // Core References
  tournamentId: "tournament_abc",        // Reference to tournament
  dojoId: "dojo_123",                   // Reference to dojo
  ownerId: "user_admin_456",            // UID of dojo admin who submitted
  
  // Data
  athleteIds: ["athlete_1", "athlete_2", "athlete_3"],  // Array of athlete UIDs
  dojoName: "Karate Academy Downtown",  // Cached dojo name for display
  
  // Status & Tracking
  status: "pending",                    // "pending" | "active" | "rejected"
  rejectionReason: null,                // Only set if status === "rejected"
  
  // Timestamps
  createdAt: Timestamp(2026, 5, 24),    // When submitted
  approvedAt: null,                     // When approved (null until approved)
  approvedBy: null,                     // UID of tournament_organizer who approved
  
  // Metadata
  athleteCount: 3,                      // Count for display
  notes: "Spring tournament batch"       // Optional notes from dojo admin
}
```

### Key Fields Explained

- **status**: 
  - `"pending"` - Awaiting organizer approval
  - `"active"` - Approved, athletes registered for tournament
  - `"rejected"` - Organizer rejected this batch

- **athleteIds[]**: Array of athlete document IDs (not nested objects, just IDs)

- **Timestamps**: All use Firebase `serverTimestamp()`

### Firestore Rules

```javascript
// Read
allow read: if 
  resource.data.ownerId == request.auth.uid ||  // Own submissions
  request.auth.token.role == 'tournament_organizer' ||  // All for organizers
  request.auth.token.role == 'super_admin';  // All for admins

// Write (Create)
allow create: if 
  request.auth.token.role == 'dojo_admin' && 
  request.resource.data.ownerId == request.auth.uid;

// Update (Approve/Reject)
allow update: if 
  request.auth.token.role == 'tournament_organizer' && 
  resource.data.tournamentId exists;
```

### Related Operations

- **Create**: `submitTournamentRegistration()` in [tournament-registration-service.js](lib/tournament-registration-service.js)
- **Read (Real-time)**: `subscribeToPendingRegistrations()` - subscribed to `where('status', '==', 'pending')`
- **Update**: `approveTournamentRegistration()` - sets status to 'active' and creates individual athlete_tournament_registrations
- **Reject**: `rejectTournamentRegistration()` - sets status to 'rejected'

---

## 2. role_requests Collection

**Purpose:** Manages spectators requesting role promotions to dojo_admin, pending super_admin approval.

**Location in Firestore:** `role_requests/`

### Document Structure

```javascript
{
  // Auto-generated document ID
  id: "role_req_def456",
  
  // Core References
  userId: "user_spectator_789",         // UID of requesting user
  userEmail: "user@example.com",        // Email for identification
  
  // Request Data
  requestedRole: "dojo_admin",          // Role being requested
  currentRole: "spectator",             // Current role (cached)
  
  // Status
  status: "pending",                    // "pending" | "approved" | "rejected"
  rejectionReason: null,                // Only if status === "rejected"
  
  // Approval Tracking
  approvedAt: null,                     // When approved (null until approved)
  approvedBy: null,                     // UID of super_admin who approved
  
  // Timestamps
  createdAt: Timestamp(2026, 5, 24),    // When request submitted
  
  // Metadata
  message: "I want to manage my dojo"   // Optional message from requestor
}
```

### Key Fields Explained

- **requestedRole**: Currently only `"dojo_admin"` is supported
  - Future: could expand to `"tournament_organizer"`, `"coach"`, etc.

- **status**:
  - `"pending"` - Awaiting super_admin review
  - `"approved"` - Approved, user's `users` doc `role` field updated
  - `"rejected"` - Denied, user remains spectator

- **Atomic Updates**: When approved, both this collection AND `users` collection are updated atomically

### Firestore Rules

```javascript
// Read (Create)
allow create: if 
  request.auth.token.role == 'spectator' && 
  request.resource.data.userId == request.auth.uid;

// Read
allow read: if 
  request.auth.token.role == 'super_admin' ||  // All for admins
  resource.data.userId == request.auth.uid;    // Own requests

// Update (Approve/Reject)
allow update: if 
  request.auth.token.role == 'super_admin';
```

### Related Operations

- **Create**: `submitRoleRequest()` in [role-request-service.js](lib/role-request-service.js)
- **Read (Real-time)**: `subscribeToPendingRoleRequests()` - subscribed to `where('status', '==', 'pending')`
- **Approve**: `approveRoleRequest()` - atomically updates BOTH collections
- **Reject**: `rejectRoleRequest()` - sets status to 'rejected'

---

## 3. referee_applications Collection

**Purpose:** Manages referee certification applications with document upload and approval workflow.

**Location in Firestore:** `referee_applications/`

### Document Structure

```javascript
{
  // Auto-generated document ID
  id: "ref_app_ghi789",
  
  // Core References
  userId: "user_applicant_101",         // UID of applicant
  userEmail: "referee@example.com",     // Email for identification
  
  // Application Data
  fullName: "Sensei John Smith",        // Full name from form
  martialArtsRank: "5th dan",           // Rank/belt level
  beltLevel: "black",                   // "white" | "yellow" | "orange" | "green" | "blue" | "brown" | "black"
  certifications: "20 years experience...",  // Text about certifications
  certificateUrl: "https://bucket/ref_cert_101.pdf",  // File upload URL (or null)
  
  // Status
  status: "pending",                    // "pending" | "approved" | "rejected"
  rejectionReason: null,                // Only if status === "rejected"
  
  // Approval Tracking
  approvedAt: null,                     // When approved (null until approved)
  approvedBy: null,                     // UID of approver
  
  // Timestamps
  createdAt: Timestamp(2026, 5, 24),    // When submitted
  
  // Metadata
  certificateFileName: "john_cert.pdf"  // Original file name for display
}
```

### Key Fields Explained

- **martialArtsRank**: Free text (e.g., "5th dan", "Shotokan instructor")

- **beltLevel**: Standardized colors:
  - `"white"`, `"yellow"`, `"orange"`, `"green"`, `"blue"`, `"brown"`, `"black"`

- **certificateUrl**: File upload URL from `uploadFileWithTracking()` utility
  - Path: `gs://bucket/referee-certificates/{userId}/...`
  - Optional field (certificate upload is not required)

- **status**:
  - `"pending"` - Awaiting review
  - `"approved"` - Approved, user's `role` upgraded to `"referee"` in `users` collection
  - `"rejected"` - Denied, remains current role

### Firestore Rules

```javascript
// Create
allow create: if 
  request.auth != null && 
  request.resource.data.userId == request.auth.uid;

// Read
allow read: if 
  request.auth.token.role == 'super_admin' ||
  request.auth.token.role == 'tournament_organizer' ||
  resource.data.userId == request.auth.uid;

// Update (Approve/Reject)
allow update: if 
  request.auth.token.role == 'super_admin' ||
  request.auth.token.role == 'tournament_organizer';
```

### Related Operations

- **Create**: `submitRefereeApplication()` in [referee-service.js](lib/referee-service.js)
- **Read (Real-time)**: `subscribeToPendingRefereeApplications()` - subscribed to `where('status', '==', 'pending')`
- **Approve**: `approveRefereeApplication()` - atomically updates BOTH collections + sets user role to `"referee"`
- **Reject**: `rejectRefereeApplication()` - sets status to 'rejected'

---

## 4. users Collection (Modified)

**Purpose:** Existing collection enhanced with organizer licensing information.

**Location in Firestore:** `users/{uid}`

### New/Modified Fields

```javascript
{
  // Existing fields
  uid: "user_org_202",
  email: "org@example.com",
  displayName: "Tournament Organizer",
  role: "tournament_organizer",  // MODIFIED: can now be updated via approvals
  
  // NEW: Organizer License (added by Module 3)
  organizerLicense: {
    active: true,                                    // License is currently valid
    plan: "standard",                                // "basic" | "standard" | "large"
    expiresAt: Timestamp(2026, 8, 24),              // When license expires
    createdAt: Timestamp(2026, 5, 24),              // When license was purchased
    
    // Plan Details (cached for display)
    maxAthletes: 500,                               // Max athletes for this plan
    features: [
      "Athletes Management",
      "Advanced Analytics",
      "Custom Branding"
    ]
  },
  
  // Existing fields remain unchanged
  createdAt: Timestamp(...),
  lastLogin: Timestamp(...),
  photoURL: "https://...",
  ...otherFields
}
```

### organizerLicense Object Details

This object stores on the user document **only if** the user is a `tournament_organizer`:

```javascript
organizerLicense: {
  // Status
  active: boolean,                    // true if license is current and not expired
  
  // Plan Info
  plan: "basic" | "standard" | "large",
  
  // Expiration
  expiresAt: Timestamp,              // Check if Date.now() < expiresAt
  
  // Tracking
  createdAt: Timestamp,              // When originally purchased
  
  // Plan Details (cached at time of purchase)
  maxAthletes: number,               // 100, 500, or 1000+
  features: string[]                 // Array of feature names
}
```

### Plan Details

| Plan | Monthly Cost | Max Athletes | Features |
|------|--------------|--------------|----------|
| **basic** | $99 | 100 | Basic tournament creation, email notifications, basic reports |
| **standard** | $299 | 500 | Everything in basic + advanced analytics, custom branding, API access |
| **large** | $799 | 1000+ | Everything in standard + 24/7 support, priority support, custom integrations |

### Firestore Rules

```javascript
// Read own license
allow read: if 
  request.auth.uid == resource.id ||
  request.auth.token.role == 'super_admin';

// Update own license (via service functions)
allow update: if 
  (request.auth.uid == resource.id && 
   request.auth.token.role == 'tournament_organizer');

// Role updates (via approvals)
allow update: if 
  request.auth.token.role == 'super_admin';
```

### Related Operations

- **Create License**: `createOrganizerLicense(userId, plan, durationMonths)` in [organizer-license-service.js](lib/organizer-license-service.js)
- **Get License**: `getOrganizerLicense(userId)` - reads from user doc
- **Validate License**: `isOrganizerLicenseActive(userId)` - checks active status and expiration
- **Renew License**: `renewOrganizerLicense(userId, newPlan, durationMonths)` - updates expiry
- **Check Limits**: `checkAthleteCountLimit(userId, athleteCount)` - validates against plan limits

---

## 5. Indexes (Auto-Created)

Firestore will automatically create these indexes when queries are first run:

### tournament_registrations

```
Collection: tournament_registrations
- Fields: tournamentId (Asc), status (Asc), createdAt (Desc)
- Fields: dojoId (Asc), status (Asc)
- Fields: ownerId (Asc), status (Asc)
```

### role_requests

```
Collection: role_requests
- Fields: status (Asc), createdAt (Desc)
- Fields: userId (Asc)
```

### referee_applications

```
Collection: referee_applications
- Fields: status (Asc), createdAt (Desc)
- Fields: userId (Asc)
```

---

## 6. Data Relationships

```
┌─────────────────────────────────────────────────────────────┐
│ User (uid)                                                  │
│ ├─ role: "tournament_organizer"                             │
│ ├─ organizerLicense: { active, plan, expiresAt } ────┐      │
│ └─ ...                                                │      │
└─────────────────────────────────────────────────────────────┘
                                                        │
                                                        ▼
                                    ┌──────────────────────────┐
                                    │ Organizer Licensing      │
                                    │ (Module 3)               │
                                    │ Plan constraints         │
                                    │ Feature access           │
                                    └──────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Tournament (id)                                              │
│ ├─ id: "tournament_abc"                                      │
│ └─ ...                                                       │
└─────────────────────────────────────────────────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│ tournament_registrations │    │ athlete_tournament_regs      │
│ (Module 1)               │    │ (Individual athlete entries) │
│ status: pending/active   │    │ After batch approval         │
│ athleteIds: [...]        │    └──────────────────────────────┘
└──────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User (uid) - Role Change Request                            │
│ status: spectator                                           │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│ role_requests            │
│ (Module 2)               │
│ status: pending/approved │
│ requestedRole: dojo_admin│
└──────────────────────────┘
           │
           ▼ (on approval)
       Update User role

┌─────────────────────────────────────────────────────────────┐
│ User (uid) - Referee Application                            │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│ referee_applications     │
│ (Module 4)               │
│ status: pending/approved │
│ certificateUrl: ...      │
└──────────────────────────┘
           │
           ▼ (on approval)
     Set User role = "referee"
```

---

## 7. Data Lifecycle Examples

### Tournament Registration Flow

```
1. Dojo Admin views tournament
2. Dojo Admin selects 5 athletes
3. Calls submitTournamentRegistration()
   └─ Creates tournament_registrations doc with status: "pending"
4. Tournament Organizer views dashboard
5. Sees pending registration (via subscribeToPendingRegistrations)
6. Reviews athlete list
7. Clicks "Approve" button
8. Calls approveTournamentRegistration()
   ├─ Updates tournament_registrations status to "active"
   └─ Creates 5 individual athlete_tournament_registrations docs
9. Athletes now appear in tournament bracket
```

### Role Request Flow

```
1. Spectator user navigates to settings
2. Sees "Apply for Dojo Admin" button
3. Clicks button
4. Calls submitRoleRequest()
   └─ Creates role_requests doc with status: "pending"
5. Super Admin views dashboard
6. Sees pending request (via subscribeToPendingRoleRequests)
7. Reviews applicant info
8. Clicks "Approve" button
9. Calls approveRoleRequest()
   ├─ Updates role_requests status to "approved"
   └─ Updates users doc: role = "dojo_admin"
10. Spectator can now create and manage dojos
```

### Referee Application Flow

```
1. User navigates to referee application
2. Fills out form with qualifications
3. Uploads PDF certificate
4. Calls submitRefereeApplication()
   ├─ Uploads certificate to Firebase Storage
   └─ Creates referee_applications doc with status: "pending"
5. Super Admin views referee applications
6. Reviews applicant info and downloads certificate
7. Clicks "Approve" button
8. Calls approveRefereeApplication()
   ├─ Updates referee_applications status to "approved"
   └─ Updates users doc: role = "referee"
9. User can now view referee dashboard and manage matches
```

### Organizer License Flow

```
1. Tournament Organizer clicks on Billing Dashboard
2. Sees "Select a Plan" page
3. Selects "Standard" plan ($299/month)
4. Clicks "Activate Plan" button
5. Calls createOrganizerLicense()
   └─ Creates/updates users doc: organizerLicense = {
        active: true,
        plan: "standard",
        expiresAt: 30 days from now,
        maxAthletes: 500,
        features: [...]
      }
6. Dashboard shows active license
7. Can now create tournaments up to 500 athletes
8. 25 days later: Warning shows "Expiring in 5 days"
9. User clicks "Renew" button
10. Calls renewOrganizerLicense() → Updates expiresAt to +30 more days
```

---

## 8. Backups & Data Retention

### Recommended Backup Strategy

- **Daily**: Automated Firestore backup via Google Cloud Console
- **On Approval**: Keep records of all approvals (approvedBy, approvedAt timestamps)
- **Rejected Records**: Keep with reason for audit trail (never delete)

### Data Retention Policy

| Collection | Retention | Notes |
|-----------|-----------|-------|
| `tournament_registrations` | Keep all | Audit trail of approvals |
| `role_requests` | Keep all | Track user role history |
| `referee_applications` | Keep all | Certification history |
| `users.organizerLicense` | Keep all | Billing history for disputes |

---

## 9. Query Examples

### Get pending tournament registrations for a tournament

```javascript
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const q = query(
  collection(db, 'tournament_registrations'),
  where('tournamentId', '==', tournamentId),
  where('status', '==', 'pending')
);

onSnapshot(q, (snapshot) => {
  const registrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(registrations);
});
```

### Get all pending role requests

```javascript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const q = query(
  collection(db, 'role_requests'),
  where('status', '==', 'pending')
);

const snapshot = await getDocs(q);
const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### Check if organizer license is active

```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const userRef = doc(db, 'users', userId);
const userDoc = await getDoc(userRef);
const userData = userDoc.data();

const isActive = 
  userData.organizerLicense?.active && 
  userData.organizerLicense?.expiresAt?.toDate() > new Date();

console.log('License active:', isActive);
```

---

## 10. Troubleshooting

### Issue: Pending registrations not showing

**Solution**: 
- Verify subscribeToPendingRegistrations() has proper unsubscribe cleanup
- Check Firestore rules allow tournament_organizer to read with status filter
- Ensure status field is exactly "pending" (case-sensitive)

### Issue: Role not updating after approval

**Solution**:
- Verify approveRoleRequest() updates both role_requests AND users docs
- Check that updates are batched (atomic) to prevent partial updates
- Ensure Firestore rules allow super_admin to update users collection

### Issue: License expiration not detected

**Solution**:
- Verify organizerLicense.expiresAt is a Firestore Timestamp (not string)
- Use `.toDate()` method: `expiresAt.toDate() > new Date()`
- Check timezone consistency (use serverTimestamp())

---

## Summary

✅ **3 New Collections**: tournament_registrations, role_requests, referee_applications
✅ **1 Modified Collection**: users (added organizerLicense field)
✅ **All Timestamps**: Use Firebase serverTimestamp() for consistency
✅ **All References**: Use document IDs (not nested objects) for performance
✅ **All Statuses**: Use standardized enums (pending/active/approved/rejected)
✅ **Real-time Subscriptions**: All approval queues use onSnapshot() for live updates
