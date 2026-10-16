import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from '../components/common/BottomNav.jsx';
import { Footer } from '../components/common/Footer.jsx';
import { Header } from '../components/common/Header.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';

const PageLoadingFallback = () => (
  <div className="space-y-6 animate-pulse py-4">
    <Skeleton className="h-44 w-full rounded-2xl" />
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-56 w-full rounded-xl" />
      ))}
    </div>
  </div>
);

export const RootLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Suspense fallback={<PageLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
      <Footer />
    </div>
  );
};

export default RootLayout;
