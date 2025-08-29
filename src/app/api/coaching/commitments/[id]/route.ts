/**
 * COMMITMENT STATUS UPDATE API ROUTE
 * 
 * This endpoint handles updating commitment status when users accept or dismiss
 * commitments. It operates on the single source of truth in the 'commitments'
 * Firestore collection.
 * 
 * FEATURES:
 * - Updates commitment status to 'accepted' or 'dismissed'
 * - Handles title and deadline modifications on acceptance
 * - Sets appropriate timestamps (acceptedAt, dismissedAt)
 * - Validates commitment ownership and existence
 * - Returns updated commitment document
 * 
 * ROUTES:
 * PATCH /api/coaching/commitments/[id] - Update commitment status
 * 
 * REQUEST:
 * - status: 'accepted' | 'dismissed'
 * - title?: string (optional title update on acceptance)
 * - selectedDeadline?: CommitmentDeadline (optional deadline change on acceptance)
 * 
 * RESPONSE:
 * - success: Boolean indicating operation success
 * - commitment: Updated commitment document
 * - error?: String error message (if operation failed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import FirestoreAdminService from '@/lib/firestore-admin';
import {
  CommitmentDeadline,
  CommitmentUpdateRequest,
  Commitment
} from '@/types/commitment';

/**
 * Safely convert Firestore timestamp to Date
 */
function convertTimestamp(timestamp: Date | { toDate(): Date } | undefined): Date | undefined {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'object' && 'toDate' in timestamp) {
    return timestamp.toDate();
  }
  return undefined;
}

/**
 * Calculate deadline timestamp from enum value
 */
function calculateDeadlineISO(deadlineType: CommitmentDeadline): string {
  const now = new Date();
  let deadlineDate: Date;
  
  switch (deadlineType) {
    case 'tomorrow':
      deadlineDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'in 2 days':
      deadlineDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      break;
    case 'next week':
      deadlineDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'next month':
      deadlineDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      deadlineDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // Default to 2 days
  }
  
  return deadlineDate.toISOString();
}

/**
 * Update Commitment Status API Route
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { id: commitmentId } = await params;
    if (!commitmentId) {
      return NextResponse.json(
        { success: false, error: 'Commitment ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const updateRequest = validateUpdateRequest(body);

    // Get commitment document from Firestore
    const db = FirestoreAdminService.getAdminDatabase();
    const commitmentRef = db.collection('commitments').doc(commitmentId);
    const commitmentDoc = await commitmentRef.get();

    if (!commitmentDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Commitment not found' },
        { status: 404 }
      );
    }

    const commitmentData = commitmentDoc.data() as Commitment;

    // Verify ownership
    if (commitmentData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to commitment' },
        { status: 403 }
      );
    }

    // Prepare update data
    const now = new Date();
    const updateData: Partial<Commitment> = {
      status: updateRequest.status
    };

    // Handle acceptance updates
    if (updateRequest.status === 'accepted') {
      updateData.acceptedAt = now;
      
      // Allow title updates on acceptance
      if (updateRequest.title && updateRequest.title.trim()) {
        updateData.title = updateRequest.title.trim();
      }
      
      // Allow deadline changes on acceptance
      if (updateRequest.selectedDeadline) {
        updateData.suggestedDeadline = updateRequest.selectedDeadline;
        updateData.commitmentDueAt = new Date(calculateDeadlineISO(updateRequest.selectedDeadline));
      }
    } else if (updateRequest.status === 'dismissed') {
      updateData.dismissedAt = now;
    }

    // Update commitment in Firestore
    await commitmentRef.update(updateData);

    // Fetch updated commitment
    const updatedDoc = await commitmentRef.get();
    const updatedData = updatedDoc.data() as Commitment;
    
    const updatedCommitment: Commitment = {
      ...updatedData,
      id: commitmentId,
      // Convert Firestore timestamps to Date objects if needed
      commitmentDueAt: convertTimestamp(updatedData.commitmentDueAt) || updatedData.commitmentDueAt,
      detectedAt: convertTimestamp(updatedData.detectedAt) || updatedData.detectedAt,
      acceptedAt: convertTimestamp(updatedData.acceptedAt),
      dismissedAt: convertTimestamp(updatedData.dismissedAt)
    };

    return NextResponse.json({
      success: true,
      commitment: updatedCommitment
    });

  } catch (error) {
    console.error('Commitment update API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update commitment'
    }, { status: 500 });
  }
}

/**
 * Validate commitment update request
 */
function validateUpdateRequest(body: unknown): CommitmentUpdateRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const bodyObj = body as Record<string, unknown>;

  if (typeof bodyObj.status !== 'string' || 
      !['accepted', 'dismissed'].includes(bodyObj.status)) {
    throw new Error('Invalid status. Must be "accepted" or "dismissed"');
  }

  const request: CommitmentUpdateRequest = {
    status: bodyObj.status as 'accepted' | 'dismissed'
  };

  // Optional title update
  if (typeof bodyObj.title === 'string' && bodyObj.title.trim()) {
    request.title = bodyObj.title.trim();
  }

  // Optional deadline update
  if (typeof bodyObj.selectedDeadline === 'string') {
    const validDeadlines = [
      CommitmentDeadline.TOMORROW,
      CommitmentDeadline.IN_2_DAYS,
      CommitmentDeadline.NEXT_WEEK,
      CommitmentDeadline.NEXT_MONTH
    ];
    
    // Try exact match first
    if (validDeadlines.includes(bodyObj.selectedDeadline as CommitmentDeadline)) {
      request.selectedDeadline = bodyObj.selectedDeadline as CommitmentDeadline;
    } else {
      // Try to map common variations
      const normalizedDeadline = bodyObj.selectedDeadline.toLowerCase().trim();
      let mappedDeadline: CommitmentDeadline | null = null;
      
      switch (normalizedDeadline) {
        case 'tomorrow':
          mappedDeadline = CommitmentDeadline.TOMORROW;
          break;
        case 'in 2 days':
        case 'in_2_days':
        case 'in2days':
          mappedDeadline = CommitmentDeadline.IN_2_DAYS;
          break;
        case 'next week':
        case 'next_week':
        case 'nextweek':
          mappedDeadline = CommitmentDeadline.NEXT_WEEK;
          break;
        case 'next month':
        case 'next_month':
        case 'nextmonth':
          mappedDeadline = CommitmentDeadline.NEXT_MONTH;
          break;
      }
      
      if (mappedDeadline) {
        request.selectedDeadline = mappedDeadline;
      } else {
        throw new Error(`Invalid selectedDeadline value: "${bodyObj.selectedDeadline}". Valid values: ${validDeadlines.join(', ')}`);
      }
    }
  }

  return request;
}
