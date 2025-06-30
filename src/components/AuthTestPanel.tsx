'use client';

import { useState } from 'react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useJournal } from '@/hooks/useJournal';

export default function AuthTestPanel() {
  const { user, isAuthenticated, loading, clerkUser, firebaseUser } = useFirebaseAuth();
  const { entries, addEntry, error: journalError } = useJournal();
  const [testEntry, setTestEntry] = useState('');
  const [testResult, setTestResult] = useState('');

  const handleTestFirestore = async () => {
    if (!testEntry.trim()) {
      setTestResult('❌ Please enter some test content');
      return;
    }

    try {
      setTestResult('⏳ Testing Firestore write...');
      const now = new Date();
      const entryId = await addEntry({
        content: testEntry,
        timestamp: now,
        uid: user!.uid, // Use the authenticated user's uid
        lastUpdated: now
      });
      
      if (entryId) {
        setTestResult(`✅ Success! Entry created with ID: ${entryId}`);
        setTestEntry('');
      } else {
        setTestResult('❌ Failed to create entry');
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900">🔄 Authentication Loading...</h3>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
      <h2 className="text-xl font-bold text-gray-900">🧪 Clerk + Firebase Test Panel</h2>
      
      {/* Authentication Status */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-700">Authentication Status:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className={`p-2 rounded ${clerkUser ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Clerk: {clerkUser ? '✅ Signed In' : '❌ Not Signed In'}
          </div>
          <div className={`p-2 rounded ${firebaseUser ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Firebase: {firebaseUser ? '✅ Signed In' : '❌ Not Signed In'}
          </div>
        </div>
      </div>

      {/* User Information */}
      {user && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">User Information:</h3>
          <div className="bg-white p-3 rounded border space-y-1 text-sm">
            <div><strong>Firebase UID:</strong> {user.uid}</div>
            <div><strong>Clerk User ID:</strong> {user.clerkUserId}</div>
            <div><strong>Email:</strong> {user.email || 'Not provided'}</div>
            <div><strong>Display Name:</strong> {user.displayName || 'Not provided'}</div>
          </div>
        </div>
      )}

      {/* Firestore Test */}
      {isAuthenticated ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">🔥 Firestore Test:</h3>
          <div className="space-y-2">
            <input
              type="text"
              value={testEntry}
              onChange={(e) => setTestEntry(e.target.value)}
              placeholder="Enter test journal entry..."
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleTestFirestore}
              disabled={!testEntry.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Test Firestore Write
            </button>
          </div>
          
          {testResult && (
            <div className="p-2 bg-white border rounded text-sm">
              {testResult}
            </div>
          )}
          
          {journalError && (
            <div className="p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
              Journal Error: {journalError}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-medium text-gray-600">📝 Your Entries ({entries.length}):</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {entries.length > 0 ? (
                entries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="p-2 bg-white border rounded text-xs">
                    <div className="font-mono text-gray-500">ID: {entry.id}</div>
                    <div className="truncate">{entry.content}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm">No entries yet</div>
              )}
              {entries.length > 5 && (
                <div className="text-gray-500 text-xs">...and {entries.length - 5} more</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800">
            🔐 Please sign in with Clerk to test Firestore functionality
          </p>
        </div>
      )}
    </div>
  );
}