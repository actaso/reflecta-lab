'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FirestoreService } from '@/lib/firestore';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AlignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (alignment: string) => void;
  isInitial?: boolean; // Whether this is the initial onboarding modal
}

export default function AlignmentModal({ 
  isOpen, 
  onClose, 
  onSaved, 
  isInitial = false 
}: AlignmentModalProps) {
  const { user } = useUser();
  const { trackAlignmentSet } = useAnalytics();
  const [alignment, setAlignment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!user?.id || !alignment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await FirestoreService.saveAlignment(user.id, alignment.trim());
      
      // Track analytics
      trackAlignmentSet({
        alignmentLength: alignment.trim().length,
        isUpdate: !isInitial
      });
      
      // Notify parent component
      onSaved?.(alignment.trim());
      
      // Reset and close
      setAlignment('');
      onClose();
    } catch (error) {
      console.error('Failed to save alignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAlignment('');
    onClose();
  };

  if (isInitial) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose}>
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
            Set Your Priority
          </DialogTitle>
          <DialogDescription className="text-neutral-600 dark:text-neutral-400">
            This helps us give you better reflection prompts.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                What&apos;s your main focus right now?
              </label>
              <Input
                value={alignment}
                onChange={(e) => setAlignment(e.target.value)}
                placeholder="Be specific: 'Launch my SaaS product by Q2' or 'Build a team of 5 engineers'"
                className="w-full"
                autoFocus
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                The more specific, the better your guidance will be.
              </p>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Skip
          </Button>
          <Button
            onClick={handleSave}
            disabled={!alignment.trim() || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </Dialog>
    );
  }

  // Settings/update modal
  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogHeader>
        <DialogTitle>Update Priority</DialogTitle>
        <DialogDescription>
          Change your main focus for better guidance.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              What&apos;s your main focus right now?
            </label>
            <Input
              value={alignment}
              onChange={(e) => setAlignment(e.target.value)}
              placeholder="Be specific: 'Launch my SaaS product by Q2' or 'Build a team of 5 engineers'"
              className="w-full"
              autoFocus
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              The more specific, the better your guidance will be.
            </p>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!alignment.trim() || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}