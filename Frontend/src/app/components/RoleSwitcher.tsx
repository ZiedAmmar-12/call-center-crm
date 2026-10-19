// RoleSwitcher.tsx - Version positionnée à droite mais avec marge
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function RoleSwitcher() {
  const { user, switchTestRole } = useAuth();
  
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (!isDev) return null;
  
  return (
    <div className="fixed top-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[160px]">
      <div className="text-xs text-gray-500 mb-1 px-2 font-semibold uppercase tracking-wider">
        🔧 Changer de rôle
      </div>
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => switchTestRole('conf1')}
          className={`px-2 py-1 text-xs rounded ${
            user?.role === 'conf1' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
          }`}
        >
          CONF1
        </button>
        <button
          onClick={() => switchTestRole('conf2')}
          className={`px-2 py-1 text-xs rounded ${
            user?.role === 'conf2' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
          }`}
        >
          CONF2
        </button>
        <button
          onClick={() => switchTestRole('admin')}
          className={`px-2 py-1 text-xs rounded ${
            user?.role === 'admin' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
          }`}
        >
          ADMIN
        </button>
        <button
          onClick={() => switchTestRole('agent')}
          className={`px-2 py-1 text-xs rounded ${
            user?.role === 'agent' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
          }`}
        >
          AGENT
        </button>
      </div>
      <div className="text-xs text-gray-400 mt-1 px-2">
        Actuel: <span className="font-bold text-blue-500">{user?.role?.toUpperCase()}</span>
      </div>
    </div>
  );
}