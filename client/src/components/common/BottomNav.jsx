import { Grid, Home, ShoppingBag, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const BottomNav = () => {
  const navItems = [
    { name: 'Home', to: '/', icon: Home },
    { name: 'Categories', to: '/categories', icon: Grid },
    { name: 'Cart', to: '/cart', icon: ShoppingBag },
    { name: 'Profile', to: '/profile', icon: User },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 py-1.5 px-4">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-900'
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
