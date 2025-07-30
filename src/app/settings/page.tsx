'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useDarkMode } from '../../hooks/useDarkMode';

export default function SettingsPage() {
  const { user } = useUser();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-neutral-900 dark:text-neutral-100 mb-2">
            Settings
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Customize your Reflecta experience
          </p>
        </div>

        {/* Settings Groups */}
        <div className="space-y-8">
          {/* Appearance */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                Appearance
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Dark Mode
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Switch between light and dark themes
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${isDarkMode ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-neutral-700'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>



          {/* Account */}
          {user && (
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
                <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                  Account
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                    Email
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {user.primaryEmailAddress?.emailAddress || 'Not set'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                    Member since
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Coming Soon */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden opacity-60">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                Coming Soon
              </h2>
            </div>
            <div className="p-6">
              <ul className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
                <li>• Export & backup options</li>
                <li>• Advanced search & filtering</li>
                <li>• Custom tags & categories</li>
                <li>• Integration with other apps</li>
                <li>• Advanced coaching preferences</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 