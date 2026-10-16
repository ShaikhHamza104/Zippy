// client/src/utils/cn.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines conditional class names and resolves Tailwind CSS class conflicts.
 *
 * @param {...any} inputs - Class names, expressions, or conditional objects
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default cn;
