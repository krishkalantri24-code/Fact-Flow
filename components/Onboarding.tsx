
import React, { useState } from 'react';
import { AppTheme } from '../types';
import { THEME_COLORS } from '../constants';

export const Onboarding: React.FC<{ theme: AppTheme; onComplete: () => void }> = ({ theme, onComplete }) => {
  const [step, setStep] = useState(0);
  const colors = THEME_COLORS[theme];

  const steps = [
    {
      title: "Swipe to Discover",
      desc: "An endless stream of verified curiosities. Just swipe up to find your next obsession.",
      icon: (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 13l5-5 5 5M7 18l5-5 5 5"/>
        </svg>
      )
    },
    {
      title: "Expand Your Mind",
      desc: "Earn XP for every insight gained. Evolve from a novice to an architect of knowledge.",
      icon: (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
      )
    },
    {
      title: "Verify & Retain",
      desc: "Test your memory with precision quizzes. Earn distinctions that prove your mastery.",
      icon: (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      )
    }
  ];

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-12 text-center ${colors.bg}`}>
      <div className={`mb-12 p-10 rounded-[48px] ${theme === 'light' ? 'bg-white shadow-xl text-[#000080]' : 'bg-white/5 text-[#FFB347]'}`}>
        {steps[step].icon}
      </div>
      <h1 className={`text-4xl font-black mb-4 tracking-tight ${colors.text}`}>{steps[step].title.toUpperCase()}</h1>
      <p className={`text-lg opacity-60 mb-16 leading-relaxed ${colors.text}`}>{steps[step].desc}</p>
      
      <div className="flex gap-3 mb-16">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all duration-500 ${step === i ? 'bg-orange-500 w-12' : 'bg-black/5 w-4'}`} />
        ))}
      </div>

      <button 
        onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onComplete()}
        className={`w-full max-w-xs py-6 rounded-[32px] font-black text-lg transition-all active:scale-95 ${theme === 'dark' ? 'bg-orange-500' : 'bg-[#000080]'} text-white shadow-2xl`}
      >
        {step === steps.length - 1 ? "ENTER SCROLL" : "CONTINUE"}
      </button>
    </div>
  );
};
