import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, PlaySquare, Film } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center py-2 px-3 text-[10px] font-medium transition-colors gap-1 ${
      isActive
        ? 'text-red-600 dark:text-red-500 font-semibold'
        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
    }`;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-13 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around z-40 px-2 transition-colors">
      <NavLink to="/" className={navClass}>
        <Home className="w-5 h-5" />
        <span>Home</span>
      </NavLink>
      <NavLink to="/shorts" className={navClass}>
        <Compass className="w-5 h-5" />
        <span>Shorts</span>
      </NavLink>
      <NavLink to="/subscriptions" className={navClass}>
        <PlaySquare className="w-5 h-5" />
        <span>Subscriptions</span>
      </NavLink>
      <NavLink to="/library" className={navClass}>
        <Film className="w-5 h-5" />
        <span>You</span>
      </NavLink>
    </nav>
  );
};
