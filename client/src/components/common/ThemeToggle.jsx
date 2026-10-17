// client/src/components/common/ThemeToggle.jsx
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore.js';

/**
 * Accessible Dark / Light Mode Toggle button with a minimum 44x44px touch target.
 *
 * @param {object} props
 * @param {string} [props.className]
 */
export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useUIStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`min-h-touch min-w-touch p-2.5 rounded-xl border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        isDark
          ? 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800 hover:text-amber-300 focus:ring-offset-slate-950'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-offset-white'
      } ${className}`}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-300 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
};

export default ThemeToggle;
