import React from 'react';
import { BossSpawn } from '../types';

interface BossListProps {
  schedule: BossSpawn[];
  currentTimeAtAnalysis: string;
  isInvasionMode: boolean;
  showSeconds: boolean;
  notificationPermission: NotificationPermission;
  onRequestNotification: () => void;
}

const BossList: React.FC<BossListProps> = ({ 
  schedule, 
  currentTimeAtAnalysis, 
  isInvasionMode,
  showSeconds,
  notificationPermission,
  onRequestNotification
}) => {
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
                <div className="flex-shrink-0 w-24 h-14 rounded-lg bg-slate-900 flex flex-col items-center justify-center border border-slate-700 px-1">
                  <div className="flex items-baseline">
                    <span className="text-amber-500 font-bold text-xl leading-none">
                        {hours}
                    </span>
                    <span className="text-amber-600 font-bold text-lg leading-none">
                        :{minutes}
                    </span>
                    {showSeconds && (
                      <span className="text-amber-700 font-bold text-sm leading-none ml-0.5">
                        :{seconds}
                      </span>
                    )}
                  </div>
                  {/* If seconds are hidden, keep the height consistent with a tiny spacer or just center it */}
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
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex flex-col space-y-3">
         <div className="flex justify-center space-x-4 text-sm">
             <button 
                onClick={() => {
                    const text = schedule.map(b => {
                      const name = isInvasionMode ? `(침공)${b.bossName}` : b.bossName;
                      const timeString = showSeconds ? b.spawnTime : b.spawnTime.split(':').slice(0, 2).join(':');
                      return `${timeString} ${name}`;
                    }).join('\n');
                    navigator.clipboard.writeText(text);
                    alert('클립보드에 복사되었습니다!');
                }}
                className="text-amber-500 hover:text-amber-400 underline cursor-pointer"
             >
                전체 목록 복사하기
             </button>

             <button
                onClick={onRequestNotification}
                className={`flex items-center underline cursor-pointer ${
                    notificationPermission === 'granted' 
                        ? 'text-green-500 hover:text-green-400' 
                        : 'text-slate-400 hover:text-slate-300'
                }`}
             >
                {notificationPermission === 'granted' ? (
                    <>
                        <span className="mr-1">🔔</span> 알림 켜짐 (1분 전)
                    </>
                ) : notificationPermission === 'denied' ? (
                    <>
                        <span className="mr-1">🔕</span> 알림 차단됨 (설정 필요)
                    </>
                ) : (
                    <>
                        <span className="mr-1">🔔</span> 알림 받기
                    </>
                )}
             </button>
         </div>
      </div>
    </div>
  );
};

export default BossList;