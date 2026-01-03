
import React, { useState } from 'react';
import { INITIAL_TOPICS, THEME_COLORS } from '../constants';
import { AppTheme } from '../types';

interface HiveProps {
  theme: AppTheme;
  selectedInterests: string[];
  onToggle: (topic: string) => void;
  onContinue: () => void;
}

export const HiveTopicSelector: React.FC<HiveProps> = ({ theme, selectedInterests, onToggle, onContinue }) => {
  const [search, setSearch] = useState("");
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const colors = THEME_COLORS[theme];
  
  const allAvailable = Array.from(new Set([...INITIAL_TOPICS, ...customTopics]));
  const filtered = allAvailable.filter(t => t.toLowerCase().includes(search.toLowerCase()));
  
  const rows = [
    filtered.slice(0, Math.ceil(filtered.length / 3)),
    filtered.slice(Math.ceil(filtered.length / 3), Math.ceil(2 * filtered.length / 3)),
    filtered.slice(Math.ceil(2 * filtered.length / 3))
  ];

  const handleCreate = () => {
    const trimmed = search.trim();
    if (trimmed && !allAvailable.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setCustomTopics(prev => [...prev, trimmed]);
      onToggle(trimmed);
      setSearch("");
    }
  };

  return (
    <div className={`fixed inset-0 z-50 p-6 flex flex-col ${colors.bg} ${colors.text}`}>
      <div className="flex flex-col items-center mb-10 text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tighter">CURATE YOUR FEED</h1>
        <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.3em]">Pick at least 3 categories</p>
      </div>

      <div className="flex items-center gap-4 mb-10">
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search or add topic..."
          className={`flex-1 ${theme === 'light' ? 'bg-white' : 'bg-white/5'} border border-slate-200 rounded-[28px] p-5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-xs`}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center overflow-x-auto no-scrollbar">
        <div className="min-w-max flex flex-col gap-6">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-4" style={{ paddingLeft: i % 2 === 0 ? '0' : '60px' }}>
              {row.map(topic => (
                <button
                  key={topic}
                  onClick={() => onToggle(topic)}
                  className={`px-8 py-4 rounded-full border transition-all duration-300 font-black text-[11px] whitespace-nowrap uppercase tracking-widest
                    ${selectedInterests.includes(topic) 
                      ? `bg-blue-600 text-white border-transparent scale-110 shadow-lg` 
                      : `${theme === 'light' ? 'bg-white border-black/5' : 'bg-white/5 border-white/5 opacity-60'}`}
                  `}
                >
                  {topic}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-10 space-y-4">
        {search && !allAvailable.some(t => t.toLowerCase() === search.toLowerCase()) && (
          <button onClick={handleCreate} className="w-full p-5 rounded-[28px] border-2 border-dashed border-blue-500/40 text-blue-500 font-black text-xs uppercase tracking-widest">
            + ADD "{search.toUpperCase()}"
          </button>
        )}

        <button
          onClick={onContinue}
          disabled={selectedInterests.length < 3}
          className={`w-full py-6 rounded-[32px] font-black text-lg transition-all shadow-xl ${selectedInterests.length >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-500 grayscale opacity-40 cursor-not-allowed'}`}
        >
          {selectedInterests.length >= 3 ? "ACTIVATE FEED" : `PICK ${3-selectedInterests.length} MORE`}
        </button>
      </div>
    </div>
  );
};
