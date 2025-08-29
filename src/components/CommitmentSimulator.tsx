"use client";

import { useState, useEffect, useCallback } from "react";
import CommitmentCard, { type Commitment } from "@/components/CommitmentCard";

interface CommitmentSimulatorProps {
  conversationHistory?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  sessionId?: string;
  triggerDetection?: boolean; // Prop to manually trigger detection
  isCoachLoading?: boolean; // Don't detect while coach is streaming
}

export default function CommitmentSimulator({ 
  conversationHistory = [], 
  sessionId, 
  triggerDetection = false,
  isCoachLoading = false
}: CommitmentSimulatorProps) {
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [lastProcessedLength, setLastProcessedLength] = useState(0);

  // Function to detect commitments from conversation
  const detectCommitments = useCallback(async () => {
    if (!conversationHistory || conversationHistory.length < 2) {
      return;
    }

    // Skip if we already have a commitment showing
    if (commitment) {
      return;
    }



    try {
      const response = await fetch('/api/coaching/commitments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationHistory,
          sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.commitmentDetected && result.commitment) {
        // Convert API response to UI format
        const uiCommitment = {
          id: result.commitment.id,
          title: result.commitment.title,
          suggestedDeadline: result.commitment.suggestedDeadline,
          suggestedDeadlineISO: result.commitment.commitmentDueAt
        };
        
        setCommitment(uiCommitment);
      }
    } catch (error) {
      console.error('Commitment detection failed:', error);
    } finally {
      // Cleanup if needed
    }
  }, [conversationHistory, sessionId, commitment]);

  // Auto-detect when coach finishes streaming (not when conversation length changes)
  useEffect(() => {
    // Only trigger when coach stops loading AND we haven't processed this conversation yet
    if (!isCoachLoading && 
        conversationHistory.length >= 2 && 
        conversationHistory.length > lastProcessedLength) {
      
      // Check if the last message is from assistant and has content
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content.trim()) {
        // Add a small delay to ensure everything is settled
        const timeoutId = setTimeout(() => {
          detectCommitments();
          setLastProcessedLength(conversationHistory.length);
        }, 300);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isCoachLoading, conversationHistory, detectCommitments, lastProcessedLength]);

  // Manual trigger detection
  useEffect(() => {
    if (triggerDetection) {
      detectCommitments();
    }
  }, [triggerDetection, detectCommitments]);

  const handleAccept = async (id: string, title: string, deadline: string) => {
    try {
      const requestBody = {
        status: 'accepted',
        title,
        selectedDeadline: deadline
      };
      
      const response = await fetch(`/api/coaching/commitments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      setCommitment(null);
    } catch (error) {
      console.error("Failed to accept commitment", error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      
      const response = await fetch(`/api/coaching/commitments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'dismissed'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      setCommitment(null);
    } catch (error) {
      console.error("Failed to dismiss commitment", error);
    }
  };

  return commitment ? (
    <CommitmentCard
      commitment={commitment}
      onAccept={handleAccept}
      onDismiss={handleDismiss}
    />
  ) : null;
}


