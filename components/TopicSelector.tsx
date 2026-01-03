
import React, { useState } from 'react';
import { INITIAL_TOPICS, THEME_COLORS } from '../constants';
import { AppTheme } from '../types';

interface TopicSelectorProps {
  theme: AppTheme;
  selectedInterests: string[];
  onToggle: (topic: string) => void;
  onContinue: () => void;
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({ theme, selectedInterests, onToggle, onContinue }) => {
  const [search, setSearch] = useState("");
  const colors = THEME_COLORS[theme];

  const filteredTopics = INITIAL_TOPICS.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  // Split into 3 rows for "hive" side-scrolling effect
  const rows = [
    filteredTopics.slice(0, Math.ceil(filteredTopics.length / 3)),
    filteredTopics.slice(Math.ceil(filteredTopics.length / 3), Math.ceil(2 * filteredTopics.length / 3)),
    filteredTopics.slice(Math.ceil(2 * filteredTopics.length / 3))
  ];

  return (
    <div className={`fixed inset-0 z-50 p-6 flex flex-col ${colors.bg} ${colors.text}`}>
      <h1 className="text-3xl font-bungee mb-2">CURATE YOUR FEED</h1>
      <p className="opacity-70 mb-6">Select topics you love. We'll find facts you won't believe.</p>
      
      <div className="relative mb-8">
        <input
          type="text"
          placeholder="Search for a topic..."
          className={`w-full p-4 rounded-2xl bg-white/10 border ${colors.border} outline-none`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && !filteredTopics.includes(search) && (
          <button 
            onClick={() => onToggle(search)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs"
          >
            Create Topic
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-hidden">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar" style={{ marginLeft: i % 2 === 0 ? '0' : '20px' }}>
            {row.map(topic => (
              <button
                key={topic}
                onClick={() => onToggle(topic)}
                className={`flex-shrink-0 px-6 py-3 rounded-full border transition-all duration-300 font-medium whitespace-nowrap
                  ${selectedInterests.includes(topic) 
                    ? `bg-[#FF7518] text-white border-transparent scale-110 shadow-lg` 
                    : `bg-white/5 ${colors.border}`}
                `}
              >
                {topic}
              </button>
            ))}
          </div>
        ))}
      </div>

      <button
        disabled={selectedInterests.length < 3}
        onClick={onContinue}
        className={`w-full py-5 rounded-3xl font-bungee text-xl transition-all shadow-xl mt-8
          ${selectedInterests.length >= 3 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-400 text-gray-200 grayscale cursor-not-allowed'}
        `}
      >
        {selectedInterests.length >= 3 ? "LET'S GOOO! 🚀" : `Pick ${3 - selectedInterests.length} more`}
      </button>
    </div>
  );
};
