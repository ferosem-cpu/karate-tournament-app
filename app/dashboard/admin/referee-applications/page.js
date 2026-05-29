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
            Only administrators can view referee applications.
          </AlertDescription>
        </Alert>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Referee Applications</h1>
          <p className="text-gray-600">Review and approve referee applications from potential officials.</p>
        </div>
        <RefereeApplicationReviewPanel />
      </div>
    </Protected>
  );
}
