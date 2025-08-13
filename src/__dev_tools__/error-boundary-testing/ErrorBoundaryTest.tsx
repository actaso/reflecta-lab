'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { ErrorBoundary, AIErrorBoundary, EditorErrorBoundary, SidebarErrorBoundary } from '@/components/error-boundaries';

// =====================================================================
// ERROR BOUNDARY TEST COMPONENT
// TEMPORARY - Only for testing error boundaries in development
// This component will be removed after testing is complete
// =====================================================================

function CrashingComponent({ shouldCrash = false }: { shouldCrash?: boolean }) {
  if (shouldCrash) {
    throw new Error('Test error from CrashingComponent');
  }
  
  return (
    <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
      <div className="flex items-center space-x-2">
        <span className="text-green-600 dark:text-green-400">✅</span>
        <span className="text-green-800 dark:text-green-200 text-sm">
          Component working normally
        </span>
      </div>
    </div>
  );
}

function AIComponentTest({ shouldCrash = false }: { shouldCrash?: boolean }) {
  if (shouldCrash) {
    throw new Error('AI feature crashed!');
  }
  
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="text-blue-600 dark:text-blue-400 text-sm">🤖 AI Feature Working</div>
    </div>
  );
}

function EditorComponentTest({ shouldCrash = false }: { shouldCrash?: boolean }) {
  if (shouldCrash) {
    throw new Error('Editor crashed!');
  }
  
  return (
    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="text-purple-600 dark:text-purple-400 text-sm">📝 Editor Working</div>
    </div>
  );
}

export default function ErrorBoundaryTest() {
  const [crashRoot, setCrashRoot] = useState(false);
  const [crashAI, setCrashAI] = useState(false);
  const [crashEditor, setCrashEditor] = useState(false);
  const [crashSidebar, setCrashSidebar] = useState(false);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="max-w-5xl w-full mx-auto">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Error Boundary Test Suite</h1>
          <p className="text-muted-foreground text-sm mt-1">Test different error boundary levels and recovery mechanisms</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl w-full mx-auto p-6 space-y-6">
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Test Controls</CardTitle>
              <CardDescription>Toggle crashes to trigger specific error boundaries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={() => setCrashRoot(!crashRoot)}
                  variant={crashRoot ? "destructive" : "outline"}
                  size="sm"
                >
                  {crashRoot ? "Fix Root" : "Crash Root"}
                </Button>
                <Button
                  onClick={() => setCrashAI(!crashAI)}
                  variant={crashAI ? "destructive" : "outline"}
                  size="sm"
                >
                  {crashAI ? "Fix AI" : "Crash AI"}
                </Button>
                <Button
                  onClick={() => setCrashEditor(!crashEditor)}
                  variant={crashEditor ? "destructive" : "outline"}
                  size="sm"
                >
                  {crashEditor ? "Fix Editor" : "Crash Editor"}
                </Button>
                <Button
                  onClick={() => setCrashSidebar(!crashSidebar)}
                  variant={crashSidebar ? "destructive" : "outline"}
                  size="sm"
                >
                  {crashSidebar ? "Fix Sidebar" : "Crash Sidebar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Root Level Test */}
          <Card>
            <CardHeader>
              <CardTitle>Root Level Error Boundary</CardTitle>
              <CardDescription>App-level fallback UI that prevents white screen</CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary level="root" context="Test Root">
                <CrashingComponent shouldCrash={crashRoot} />
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* AI Feature Test */}
          <Card>
            <CardHeader>
              <CardTitle>AI Feature Error Boundary</CardTitle>
              <CardDescription>Isolates AI features and shows safe fallback</CardDescription>
            </CardHeader>
            <CardContent>
              <AIErrorBoundary>
                <AIComponentTest shouldCrash={crashAI} />
              </AIErrorBoundary>
            </CardContent>
          </Card>

          {/* Editor Test */}
          <Card>
            <CardHeader>
              <CardTitle>Editor Error Boundary</CardTitle>
              <CardDescription>Prevents editor crash from affecting the page</CardDescription>
            </CardHeader>
            <CardContent>
              <EditorErrorBoundary>
                <EditorComponentTest shouldCrash={crashEditor} />
              </EditorErrorBoundary>
            </CardContent>
          </Card>

          {/* Sidebar Test */}
          <Card>
            <CardHeader>
              <CardTitle>Sidebar Error Boundary</CardTitle>
              <CardDescription>Isolates navigation-related failures</CardDescription>
            </CardHeader>
            <CardContent>
              <SidebarErrorBoundary>
                <CrashingComponent shouldCrash={crashSidebar} />
              </SidebarErrorBoundary>
            </CardContent>
          </Card>

          {/* Nested Error Boundaries Test */}
          <Card>
            <CardHeader>
              <CardTitle>Nested Error Boundaries</CardTitle>
              <CardDescription>Feature boundaries inside a page boundary</CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary level="page" context="Page Level">
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <p className="text-sm text-muted-foreground">Page-level boundary contains feature boundaries:</p>
                  <AIErrorBoundary>
                    <AIComponentTest shouldCrash={crashAI} />
                  </AIErrorBoundary>
                  <EditorErrorBoundary>
                    <EditorComponentTest shouldCrash={crashEditor} />
                  </EditorErrorBoundary>
                </div>
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Test Instructions</CardTitle>
              <CardDescription>How to validate each boundary level</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                <li>Click &quot;Crash&quot; buttons to trigger errors in different boundary levels</li>
                <li>Observe how each boundary handles errors with appropriate fallback UI</li>
                <li>Use &quot;Try Again&quot; buttons in error states to test recovery</li>
                <li>Check browser console for error logging (dev vs production)</li>
                <li>Test nested boundaries to ensure isolation</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
