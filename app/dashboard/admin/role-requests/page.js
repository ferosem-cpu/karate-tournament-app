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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pending Role Requests</h1>
          <p className="text-gray-600">Review and approve requests from spectators to become dojo admins.</p>
        </div>
        <RoleRequestApprovalQueue />
      </div>
    </Protected>
  );
}
