'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { approveRoleRequest, rejectRoleRequest } from '@/lib/role-request-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, X, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function RoleRequestApprovalQueue() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Only super_admin
  if (profile?.role !== 'super_admin') {
    return (
      <Alert className="border-red-500/40 bg-red-500/5">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-300">
          Only super admins can view role requests.
        </AlertDescription>
      </Alert>
    );
  }

  useEffect(() => {
    const q = query(
      collection(db, 'role_requests'),
      where('status', '==', 'pending')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleApprove = async (requestId, userId, requestedRole) => {
    setProcessingId(requestId);
    try {
      await approveRoleRequest(requestId, userId, requestedRole);
      toast.success(`User approved as ${requestedRole}`);
    } catch (err) {
      toast.error(err.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    if (!confirm('Reject this role request?')) return;

    setProcessingId(requestId);
    try {
      await rejectRoleRequest(requestId, 'Rejected by admin');
      toast.success('Request rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading role requests…
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-10 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">No pending role requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Role Request Approval Queue</h3>
        <p className="text-sm text-muted-foreground mb-4">{requests.length} applications pending review</p>
      </div>

      {requests.map((req) => (
        <Card key={req.id} className="border-blue-500/40 bg-blue-500/5">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold">{req.userEmail}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Applied {new Date(req.createdAt?.toDate?.() || req.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/40">
                Requesting: {req.requestedRole}
              </Badge>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(req.id)}
                disabled={processingId === req.id}
              >
                {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => handleApprove(req.id, req.userId, req.requestedRole)}
                disabled={processingId === req.id}
              >
                {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                Approve
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
