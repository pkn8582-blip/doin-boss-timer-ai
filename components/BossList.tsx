import React from 'react';
import { BossSpawn } from '../types';

interface BossListProps {
  schedule: BossSpawn[];
  currentTimeAtAnalysis: string;
  isInvasionMode: boolean;
}

const BossList: React.FC<BossListProps> = ({ schedule, currentTimeAtAnalysis, isInvasionMode }) => {
  if (schedule.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in-up">
      <div className="flex justify-between items-end mb-3 px-1">
        <h2 className="text-lg font-semibold text-slate-200">
          {isInvasionMode ? "침공 보스 등장 일정" : "보스 등장 일정"}
        </h2>
        <span className="text-xs text-slate-500">기준 시간: {currentTimeAtAnalysis}</span>
      </div>
      
      <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 divide-y divide-slate-700/50">
        {schedule.map((boss, index) => {
          const timeParts = boss.spawnTime.split(':');
          const hours = timeParts[0];
          const minutes = timeParts[1] || '00';
          const seconds = timeParts[2] || '00';
          
          const displayName = isInvasionMode ? `(침공)${boss.bossName}` : boss.bossName;

          return (
            <div 
              key={`${boss.bossName}-${index}`}
              className="flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-20 h-14 rounded-lg bg-slate-900 flex flex-col items-center justify-center border border-slate-700 px-1">
                  <div className="flex items-baseline">
                    <span className="text-amber-500 font-bold text-lg leading-none">
                        {hours}
                    </span>
                    <span className="text-amber-600 font-bold text-sm leading-none">
                        :{minutes}
                    </span>
                  </div>
                  <span className="text-slate-500 text-xs leading-none mt-1">
                      :{seconds}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={`font-medium text-lg ${isInvasionMode ? 'text-red-300' : 'text-slate-100'}`}>
                    {displayName}
                  </span>
                  {boss.remainingTimeText && (
                    <span className="text-xs text-slate-500">
                      (남은 시간: {boss.remainingTimeText})
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-slate-400 text-sm">
                 {/* Optional visual indicator */}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-center">
         <button 
            onClick={() => {
                const text = schedule.map(b => {
                  const name = isInvasionMode ? `(침공)${b.bossName}` : b.bossName;
                  return `${b.spawnTime} ${name}`;
                }).join('\n');
                navigator.clipboard.writeText(text);
                alert('클립보드에 복사되었습니다!');
            }}
            className="text-xs text-amber-500 hover:text-amber-400 underline cursor-pointer"
         >
            전체 목록 복사하기
         </button>
      </div>
    </div>
  );
};

export default BossList;