
import React from 'react';

interface XPProgressProps {
  xp: number;
  nextLevelXp: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export const XPProgress: React.FC<XPProgressProps> = ({ 
  xp, 
  nextLevelXp, 
  size = 60, 
  strokeWidth = 4, 
  color = "#FF7518" 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(xp / nextLevelXp, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
    </div>
  );
};
