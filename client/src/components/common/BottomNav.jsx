import { Grid, Home, ShoppingBag, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore.js';
import { useCart } from '../../hooks/useCart.js';

export const BottomNav = () => {
  const { toggleCartDrawer } = useUIStore();
  const { totalItemCount } = useCart();

  const navItems = [
    { name: 'Home', to: '/', icon: Home },
    { name: 'Categories', to: '/categories', icon: Grid },
    { name: 'Cart', icon: ShoppingBag, isCart: true },
    { name: 'Profile', to: '/profile', icon: User },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-30 py-1.5 px-4">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isCart) {
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => toggleCartDrawer(true)}
                className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors relative"
                aria-label={`Shopping Cart, ${totalItemCount} items`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 mb-0.5" />
                  {totalItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-brand-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                      {totalItemCount}
                    </span>
                  )}
                </div>
                <span>{item.name}</span>
              </button>
            );
          }
          return (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
