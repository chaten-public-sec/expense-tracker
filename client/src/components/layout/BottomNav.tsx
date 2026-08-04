import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Users, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
    { label: 'Members', path: '/members', icon: Users },
    { label: 'Profile', path: '/profile', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 py-1.5 px-4">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-black font-bold scale-105'
                    : 'text-zinc-400 hover:text-zinc-700 font-medium'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
