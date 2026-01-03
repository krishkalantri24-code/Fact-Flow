
import React from 'react';
import { AppTheme, AppView } from '../types';
import { THEME_COLORS } from '../constants';

interface NavBarProps {
  theme: AppTheme;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ theme, currentView, onViewChange }) => {
  const colors = THEME_COLORS[theme];

  const NavItem = ({ view, icon, activeColor }: { view: AppView, icon: React.ReactNode, activeColor: string }) => {
    const active = currentView === view;
    
    return (
      <button 
        onClick={() => onViewChange(view)}
        className="relative flex flex-col items-center justify-center h-full flex-1 group"
      >
        <div className={`relative z-10 transition-all duration-300 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
          {icon}
        </div>
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 pointer-events-none`}>
          <div className={`rounded-full transition-all duration-300 ease-out ${active ? `w-12 h-12 opacity-100 ${activeColor}` : 'w-0 h-0 opacity-0'}`} />
        </div>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 z-[60] flex items-center justify-center p-4">
      <div className={`w-full max-w-sm h-16 flex items-center justify-around rounded-full shadow-lg border border-slate-200/50 overflow-hidden ${theme === 'dark' ? 'bg-[#111111]' : 'bg-white'}`}>
        <NavItem 
          view="feed" 
          activeColor="bg-blue-600"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} 
        />
        <NavItem 
          view="saved" 
          activeColor="bg-emerald-600"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>} 
        />
        <NavItem 
          view="quiz" 
          activeColor="bg-slate-700"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} 
        />
        <NavItem 
          view="profile" 
          activeColor="bg-orange-600"
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>} 
        />
      </div>
    </div>
  );
};
