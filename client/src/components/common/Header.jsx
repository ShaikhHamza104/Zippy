import { MapPin, Search, ShoppingBag, User, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header = () => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Delivery Info */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-md"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white font-extrabold text-lg shadow-sm">
                <Zap className="w-5 h-5 fill-current" />
              </span>
              <span className="text-2xl font-black tracking-tight text-gray-900">
                Zippy<span className="text-brand-600">.</span>
              </span>
            </Link>

            {/* Fast Delivery Location Pill */}
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-brand-600 text-brand-600" />
                Delivery in 10 mins
              </span>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium truncate max-w-[200px]"
                aria-label="Select delivery location"
              >
                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                <span>Select your location</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden sm:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="search"
                placeholder="Search for 'milk', 'chips', 'fresh fruits'..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                aria-label="Search products"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:text-brand-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </Link>

            <button
              type="button"
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              aria-label="View shopping cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">My Cart</span>
              <span className="bg-brand-700 text-white text-xs px-2 py-0.5 rounded-full font-extrabold">
                0
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="sm:hidden pb-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              aria-label="Search products mobile"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
