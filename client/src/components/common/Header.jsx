// client/src/components/common/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  ShoppingBag,
  User,
  Zap,
  ShieldAlert,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { useCart } from '../../hooks/useCart.js';
import { apiFetch } from '../../services/api.js';
// ThemeToggle kept intact in ThemeToggle.jsx and uiStore.js for future use
// import { ThemeToggle } from './ThemeToggle.jsx';

export const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, hasRole } = useAuthStore();
  const { deliveryPincode, togglePincodeModal, toggleCartDrawer } = useUIStore();
  const { totalItemCount } = useCart();

  const isAdmin = hasRole('ADMIN') || hasRole('SUPER_ADMIN');

  // Search state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  // Debounced live suggestions query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions(null);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await apiFetch(`/api/v1/search/suggestions?q=${encodeURIComponent(trimmed)}`);
        setSuggestions(res.data);
        setShowDropdown(true);
      } catch {
        setSuggestions(null);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to dismiss suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowDropdown(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestionClick = (path) => {
    setShowDropdown(false);
    setQuery('');
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Logo & Delivery Info */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-md"
              aria-label="Zippy Home"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white font-extrabold text-lg shadow-sm">
                <Zap className="w-5 h-5 fill-current" />
              </span>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Zippy<span className="text-brand-600">.</span>
              </span>
            </Link>

            {/* Fast Delivery Location Pill */}
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-brand-600 text-brand-600 dark:text-brand-400" />
                Delivery in 10 mins
              </span>
              <button
                type="button"
                onClick={() => togglePincodeModal(true)}
                className="flex items-center gap-1 text-xs text-gray-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 font-semibold truncate max-w-[200px] focus:outline-none focus:underline"
                aria-label={`Delivery location: ${deliveryPincode ? `PIN ${deliveryPincode}` : 'Select your location'}`}
              >
                <MapPin className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                <span>{deliveryPincode ? `PIN: ${deliveryPincode}` : 'Select location'}</span>
              </button>
            </div>
          </div>

          {/* Search Bar with Autocomplete Dropdown */}
          <div ref={searchContainerRef} className="flex-1 max-w-xl hidden sm:block relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600 dark:text-brand-400" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions && query.trim().length >= 2) setShowDropdown(true);
                }}
                placeholder="Search for 'milk', 'chips', 'fresh fruits'..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                aria-label="Search products"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions(null);
                    setShowDropdown(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Suggestions Popover (z-40) */}
            {showDropdown && suggestions && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-floating border border-slate-200 dark:border-slate-800 overflow-hidden z-40">
                {/* Categories matched */}
                {suggestions.categories?.length > 0 && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">
                      Categories
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {suggestions.categories.map((cat) => (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => handleSuggestionClick(`/categories/${cat.slug}`)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-400 flex items-center gap-1 transition-colors"
                        >
                          <span>{cat.icon || '🛍️'}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products matched */}
                {suggestions.products?.length > 0 ? (
                  <div className="py-1 divide-y divide-slate-50 dark:divide-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3.5 py-1 block">
                      Products
                    </span>
                    {suggestions.products.map((item) => (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => handleSuggestionClick(`/products/${item.slug}`)}
                        className="w-full px-3.5 py-2 flex items-center justify-between text-left hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {item.brand} • {item.variants?.[0]?.unit || 'Standard'}
                          </div>
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white shrink-0 ml-3">
                          ₹{item.primaryPrice || item.variants?.[0]?.price}
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full px-3.5 py-2.5 text-xs font-bold text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors border-t border-slate-100 dark:border-slate-800"
                    >
                      <span>View all results for &ldquo;{query}&rdquo;</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    No products found matching &ldquo;{query}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme toggle temporarily hidden per user request; functionality preserved in ThemeToggle.jsx & uiStore.js */}
            {/* <ThemeToggle /> */}

            {/* Admin Portal Shortcut if Admin */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg transition-colors border border-amber-200 dark:border-amber-800"
                aria-label="Admin Dashboard"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Admin</span>
              </Link>
            )}

            {/* Auth Link: User Profile or Login */}
            {isAuthenticated ? (
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Account Profile"
              >
                <User className="w-4 h-4" />
                <span className="max-w-[120px] truncate">{user?.name || 'Account'}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Customer Login"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}

            {/* Cart Trigger */}
            <button
              type="button"
              onClick={() => toggleCartDrawer(true)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 min-h-[44px] shrink-0"
              aria-label={`Shopping Cart, ${totalItemCount} items`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">My Cart</span>
              <span className="bg-brand-700 text-white text-xs px-2 py-0.5 rounded-full font-extrabold">
                {totalItemCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="sm:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              aria-label="Search products mobile"
            />
          </form>
        </div>
      </div>
    </header>
  );
};

export default Header;
