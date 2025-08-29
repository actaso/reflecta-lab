"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommitmentDeadline } from "@/types/commitment";

export type Commitment = {
  id: string;
  title: string;
  summary?: string;
  suggestedDeadline?: string; // From API response
  suggestedDeadlineISO?: string | null;
};



const DEADLINE_OPTIONS = [
  { label: "tomorrow", deadline: CommitmentDeadline.TOMORROW },
  { label: "in 2 days", deadline: CommitmentDeadline.IN_2_DAYS },
  { label: "next week", deadline: CommitmentDeadline.NEXT_WEEK },
  { label: "next month", deadline: CommitmentDeadline.NEXT_MONTH },
];

interface CommitmentCardProps {
  commitment: Commitment;
  className?: string;
  onAccept?: (commitmentId: string, title: string, deadline: CommitmentDeadline, deadlineISO: string) => void;
  onDismiss?: (commitmentId: string) => void;
  defaultOpen?: boolean;
}

export default function CommitmentCard({
  commitment,
  className,
  onAccept,
  onDismiss,
  defaultOpen = true,
}: CommitmentCardProps) {
  const [isVisible, setIsVisible] = useState(defaultOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [title, setTitle] = useState(commitment.title);
  const [selectedDeadline, setSelectedDeadline] = useState<CommitmentDeadline>(() => {
    // Use suggested deadline from API, or default to IN_2_DAYS
    if (commitment.suggestedDeadline) {
      const suggested = commitment.suggestedDeadline as CommitmentDeadline;
      // Verify it's a valid enum value
      if (Object.values(CommitmentDeadline).includes(suggested)) {
        return suggested;
      }
    }
    return CommitmentDeadline.IN_2_DAYS;
  });

  useEffect(() => {
    if (!defaultOpen) setIsVisible(true);
  }, [defaultOpen]);

  const handleAccept = async () => {
    setIsClosing(true);
    
    // Calculate deadline based on selected option
    let deadlineDate: Date;
    const now = new Date();
    
    switch (selectedDeadline) {
      case CommitmentDeadline.TOMORROW:
        deadlineDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case CommitmentDeadline.IN_2_DAYS:
        deadlineDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        break;
      case CommitmentDeadline.NEXT_WEEK:
        deadlineDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case CommitmentDeadline.NEXT_MONTH:
        deadlineDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        deadlineDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    }
    
    const deadlineISO = deadlineDate.toISOString();
    
    // Wait for animation to start before calling callback
    setTimeout(() => {
      if (onAccept) onAccept(commitment.id, title, selectedDeadline, deadlineISO);
      setIsVisible(false);
    }, 150);
  };

  const handleDismiss = async () => {
    setIsClosing(true);
    
    // Wait for animation to start before calling callback  
    setTimeout(() => {
      if (onDismiss) onDismiss(commitment.id);
      setIsVisible(false);
    }, 150);
  };

  const handleDeadlineChange = (value: string) => {
    setSelectedDeadline(value as CommitmentDeadline);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ 
            opacity: isClosing ? 0 : 1, 
            y: isClosing ? -8 : 0, 
            scale: isClosing ? 0.95 : 1 
          }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ 
            duration: isClosing ? 0.2 : 0.25, 
            ease: isClosing ? "easeIn" : "easeOut" 
          }}
          className={cn("w-full", className)}
        >
          <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm font-medium bg-transparent border-none outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-500"
                  placeholder="What will you commit to?"
                />
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">
                    Check in
                  </span>
                  <Select value={selectedDeadline} onValueChange={handleDeadlineChange}>
                    <SelectTrigger className="h-6 w-auto min-w-0 border-none bg-transparent p-0 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 underline decoration-dotted underline-offset-2 focus:ring-0 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEADLINE_OPTIONS.map((option) => (
                        <SelectItem key={option.deadline} value={option.deadline}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={isClosing}
                  className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4 text-neutral-500" />
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isClosing}
                  className="p-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4 text-white dark:text-black" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


