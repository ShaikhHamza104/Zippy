import { Home, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-gray-400 dark:text-slate-500 mb-4">
        <SearchX className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mb-6">
        Sorry, we couldn&apos;t find the grocery item or page you were looking for.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <Home className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>
    </div>
  );
};

export default NotFoundPage;
