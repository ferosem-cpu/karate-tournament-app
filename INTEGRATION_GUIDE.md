# 5-Module Integration Guide

This guide shows exactly where and how to integrate the 5 new modules into your existing pages.

---

## MODULE 1: Tournament Registration Approval Workflow

### Step 1A: Add to Tournament Detail Page
**File:** `app/dashboard/tournaments/[id]/page.js`

```jsx
// Add these imports at the top
import TournamentRegistrationSubmission from '@/components/tournament-registration-submission';
import OrganizerApprovalDashboard from '@/components/organizer-approval-dashboard';

// Inside the page component, after the tournament info section, add:
<div className="mt-8">
  <h2 className="text-2xl font-bold mb-6">Athlete Registration</h2>
  
  {/* Show for dojo admins submitting registrations */}
  <TournamentRegistrationSubmission 
    tournamentId={params.id} 
    dojoId={userProfile?.dojoId}
    dojoName={userProfile?.dojoName}
  />
  
  {/* Show approval dashboard for tournament organizers */}
  {profile?.role === 'tournament_organizer' && (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Pending Registrations</h3>
      <OrganizerApprovalDashboard tournamentId={params.id} />
    </div>
  )}
</div>
```

---

## MODULE 2: Role Request Approval Queue

### Step 2A: Add "Apply for Dojo Admin" to Dashboard Settings
**File:** `app/dashboard/settings/page.js`

```jsx
// Add import
import ApplyForRoleButton from '@/components/apply-for-role-button';

// Inside the settings page, add a new section:
<div className="mt-8">
  <h2 className="text-xl font-bold mb-4">Account & Roles</h2>
  <ApplyForRoleButton />
</div>
```

### Step 2B: Create New Admin Dashboard Page
**File:** `app/dashboard/admin/role-requests/page.js` (NEW)

```jsx
'use client';

import { useAuth } from '@/lib/auth-context';
import RoleRequestApprovalQueue from '@/components/role-request-approval-queue';
import Protected from '@/components/protected';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function RoleRequestsPage() {
  const { profile } = useAuth();

  if (profile?.role !== 'super_admin') {
    return (
      <Protected>
        <Alert variant="destructive" className="max-w-md mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only super admins can view pending role requests.
          </AlertDescription>
        </Alert>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Pending Role Requests</h1>
        <RoleRequestApprovalQueue />
      </div>
    </Protected>
  );
}
```

---

## MODULE 3: Organizer Licensing & Tier Management

### Step 3A: Add Billing Dashboard to Settings
**File:** `app/dashboard/settings/page.js`

```jsx
// Add import
import OrganizerBillingDashboard from '@/components/organizer-billing-dashboard';

// Inside settings page, add new section:
{profile?.role === 'tournament_organizer' && (
  <div className="mt-8">
    <h2 className="text-xl font-bold mb-4">Billing & License</h2>
    <OrganizerBillingDashboard />
  </div>
)}
```

---

## MODULE 4: Referee Registration & Profile Wizard

### Step 4A: Add Referee Application Form to Dashboard
**File:** `app/dashboard/page.js` (main dashboard)

```jsx
// Add import
import RefereeApplicationForm from '@/components/referee-application-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Add to dashboard tabs or sections:
{profile?.role === 'spectator' && (
  <div className="mt-8">
    <h2 className="text-xl font-bold mb-4">Become a Referee</h2>
    <RefereeApplicationForm />
  </div>
)}
```

### Step 4B: Create Admin Review Dashboard
**File:** `app/dashboard/admin/referee-applications/page.js` (NEW)

```jsx
'use client';

import { useAuth } from '@/lib/auth-context';
import RefereeApplicationReviewPanel from '@/components/referee-application-review-panel';
import Protected from '@/components/protected';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function RefereeApplicationsPage() {
  const { profile } = useAuth();

  const canReview = profile?.role === 'super_admin' || 
                    profile?.role === 'tournament_organizer';

  if (!canReview) {
    return (
      <Protected>
        <Alert variant="destructive" className="max-w-md mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only admins can view referee applications.
          </AlertDescription>
        </Alert>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Referee Applications</h1>
        <RefereeApplicationReviewPanel />
      </div>
    </Protected>
  );
}
```

---

## MODULE 5: Organizer Onboarding Wizard

**Already implemented!** ✅ The wizard is available at `/dashboard/onboarding`

The route `app/dashboard/onboarding/page.js` is already created and restricted to `tournament_organizer` role.

### Add Link to Navigation
**File:** `components/app-sidebar.jsx` (in your navigation menu)

```jsx
// Add a new menu item for organizers:
{profile?.role === 'tournament_organizer' && (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <Link href="/dashboard/onboarding" className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        <span>Setup Wizard</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

Or add a button on the main dashboard:

```jsx
// In app/dashboard/page.js
{profile?.role === 'tournament_organizer' && !hasCompletedTournamentSetup && (
  <Card className="border-blue-500 bg-blue-50">
    <CardContent className="pt-6">
      <h3 className="font-semibold mb-2">Get Started with Your First Tournament</h3>
      <p className="text-sm text-gray-600 mb-4">
        Use our setup wizard to create your first tournament in minutes.
      </p>
      <Button asChild>
        <Link href="/dashboard/onboarding">Start Setup Wizard</Link>
      </Button>
    </CardContent>
  </Card>
)}
```

---

## Directory Structure for New Routes

Create these new directories if they don't exist:

```
app/dashboard/
├─ admin/
│  ├─ role-requests/
│  │  └─ page.js          (NEW - from Step 2B)
│  └─ referee-applications/
│     └─ page.js          (NEW - from Step 4B)
└─ onboarding/
   └─ page.js             (ALREADY EXISTS)
```

---

## Step-by-Step Checklist

- [ ] **Module 1**: Add TournamentRegistrationSubmission + OrganizerApprovalDashboard to tournament detail page
- [ ] **Module 2A**: Add ApplyForRoleButton to settings page
- [ ] **Module 2B**: Create `/dashboard/admin/role-requests/page.js`
- [ ] **Module 3**: Add OrganizerBillingDashboard to settings page (organizers only)
- [ ] **Module 4A**: Add RefereeApplicationForm to dashboard (spectators only)
- [ ] **Module 4B**: Create `/dashboard/admin/referee-applications/page.js`
- [ ] **Module 5**: Add navigation link to `/dashboard/onboarding` in sidebar or dashboard

---

## Component Import Paths

Use these exact import paths:

```javascript
// Services
import { submitTournamentRegistration, approveTournamentRegistration, rejectTournamentRegistration, subscribeToPendingRegistrations } from '@/lib/tournament-registration-service';
import { submitRoleRequest, approveRoleRequest, rejectRoleRequest, subscribeToPendingRoleRequests } from '@/lib/role-request-service';
import { createOrganizerLicense, getOrganizerLicense, isOrganizerLicenseActive } from '@/lib/organizer-license-service';
import { submitRefereeApplication, approveRefereeApplication, rejectRefereeApplication, subscribeToPendingRefereeApplications } from '@/lib/referee-service';

// Components
import TournamentRegistrationSubmission from '@/components/tournament-registration-submission';
import OrganizerApprovalDashboard from '@/components/organizer-approval-dashboard';
import ApplyForRoleButton from '@/components/apply-for-role-button';
import RoleRequestApprovalQueue from '@/components/role-request-approval-queue';
import OrganizerTierSelector from '@/components/organizer-tier-selector';
import OrganizerBillingDashboard from '@/components/organizer-billing-dashboard';
import RefereeApplicationForm from '@/components/referee-application-form';
import RefereeApplicationReviewPanel from '@/components/referee-application-review-panel';
import OrganizerOnboardingWizard from '@/components/organizer-onboarding-wizard';
```

---

## Testing Each Module

### Test Tournament Registration
1. Login as dojo_admin
2. Go to tournament detail page
3. See TournamentRegistrationSubmission component
4. Select athletes and submit
5. Login as tournament_organizer
6. See pending registrations in OrganizerApprovalDashboard
7. Click approve/reject

### Test Role Requests
1. Login as spectator
2. Go to `/dashboard/settings`
3. See "Apply for Dojo Admin" button
4. Click and submit request
5. Login as super_admin
6. Go to `/dashboard/admin/role-requests`
7. See pending request and approve/reject

### Test Licensing
1. Login as tournament_organizer
2. Go to `/dashboard/settings`
3. See OrganizerBillingDashboard
4. If no license: see tier selector
5. Click tier to activate
6. Verify license is active

### Test Referee Application
1. Login as spectator
2. Go to `/dashboard`
3. See RefereeApplicationForm
4. Fill out form and upload certificate
5. Go to `/dashboard/admin/referee-applications` as super_admin
6. See pending application
7. Click approve to upgrade user to referee role

### Test Onboarding
1. Login as tournament_organizer
2. Navigate to `/dashboard/onboarding`
3. Go through 7 steps
4. Complete setup wizard
5. See new tournament created

---

## Firestore Collections (Auto-Created)

The following collections will be created automatically when first document is added:

- `tournament_registrations` - Batch registrations pending approval
- `role_requests` - Pending role change requests  
- `referee_applications` - Pending referee applications

No manual setup needed—Firestore creates these on first write!
