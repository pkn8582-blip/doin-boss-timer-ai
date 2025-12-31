import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import BossList from './components/BossList';
import { BossSpawn, ProcessingState } from './types';
import { analyzeScreenshots } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [schedule, setSchedule] = useState<BossSpawn[]>([]);
  const [analysisTime, setAnalysisTime] = useState<string>("");
  const [isInvasionMode, setIsInvasionMode] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Keep track of which bosses have already triggered a notification to prevent duplicates
  // Key format: "BossName-SpawnTime"
  const notifiedBossesRef = useRef<Set<string>>(new Set());

  const [status, setStatus] = useState<ProcessingState>({
    isLoading: false,
    error: null,
    success: false,
  });

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Timer for checking boss spawn times
  useEffect(() => {
    if (notificationPermission !== 'granted' || schedule.length === 0) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      
      schedule.forEach(boss => {
        const uniqueKey = `${boss.bossName}-${boss.spawnTime}`;
        if (notifiedBossesRef.current.has(uniqueKey)) return;

        // Parse spawn time
        const [h, m, s] = boss.spawnTime.split(':').map(Number);
        const spawnDate = new Date();
        spawnDate.setHours(h, m, s, 0);

        // Handle day rollover (if spawn time is earlier than now by a large margin, assume it's tomorrow, 
        // but here we usually just need to check if it's in the near future)
        // If spawnDate is significantly in the past compared to now, it might mean it's for tomorrow 
        // (e.g. now is 23:50, spawn is 00:10).
        if (spawnDate.getTime() < now.getTime() - 1000 * 60 * 60 * 12) {
             spawnDate.setDate(spawnDate.getDate() + 1);
        } else if (spawnDate.getTime() < now.getTime()) {
             // Already passed, ignore
             return;
        }

        const diffMs = spawnDate.getTime() - now.getTime();
        const diffSeconds = diffMs / 1000;

        // Trigger if between 0 and 60 seconds (1 minute before)
        if (diffSeconds > 0 && diffSeconds <= 60) {
          const name = isInvasionMode ? `(침공)${boss.bossName}` : boss.bossName;
          
          new Notification('오딘 보스 알림', {
            body: `${name} 등장 1분 전입니다! (${boss.spawnTime})`,
            icon: '/favicon.ico', // Optional: triggers if you have a favicon
            requireInteraction: true
          });

          notifiedBossesRef.current.add(uniqueKey);
        }
      });
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [schedule, notificationPermission, isInvasionMode]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("이 브라우저는 알림을 지원하지 않습니다.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    
    if (permission === 'granted') {
      new Notification('오딘 보스 알림', { body: '알림이 활성화되었습니다!' });
    }
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    if (selectedFiles.length === 0) {
        setSchedule([]);
        notifiedBossesRef.current.clear();
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    setStatus({ isLoading: true, error: null, success: false });
    
    try {
      // Get current system time formatted as HH:mm:ss to serve as a fallback
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const systemTime = `${hours}:${minutes}:${seconds}`;
      
      const result = await analyzeScreenshots(files, systemTime);
      
      const refTimeStr = result.referenceTime.match(/^\d{1,2}:\d{2}(:\d{2})?$/) 
        ? result.referenceTime 
        : systemTime;

      const getSeconds = (timeStr: string) => {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 0) return 0;
        
        let totalSeconds = 0;
        if (parts.length >= 1) totalSeconds += parts[0] * 3600;
        if (parts.length >= 2) totalSeconds += parts[1] * 60;
        if (parts.length >= 3) totalSeconds += parts[2];
        
        return totalSeconds;
      };

      const refSeconds = getSeconds(refTimeStr);

      const sortedBosses = [...result.bosses].sort((a, b) => {
        let secA = getSeconds(a.spawnTime);
        let secB = getSeconds(b.spawnTime);

        if (secA < refSeconds) secA += 86400;
        if (secB < refSeconds) secB += 86400;

        return secA - secB;
      });
      
      setSchedule(sortedBosses);
      // Clear notified history when new analysis happens so we don't miss new triggers
      notifiedBossesRef.current.clear(); 
      
      setAnalysisTime(result.referenceTime);
      setStatus({ isLoading: false, error: null, success: true });
    } catch (err: any) {
      setStatus({ 
        isLoading: false, 
        error: err.message || "분석 중 오류가 발생했습니다.", 
        success: false 
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Header />

        <main className="space-y-8">
          <section>
            <ImageUploader 
              files={files} 
              onFilesSelected={handleFilesSelected} 
              isLoading={status.isLoading}
            />
            
            <div className="flex items-center justify-center mt-6 mb-2">
              <label className="flex items-center space-x-2 cursor-pointer group select-none">
                <input 
                  type="checkbox" 
                  checked={isInvasionMode}
                  onChange={(e) => setIsInvasionMode(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded focus:ring-amber-500 bg-slate-800 border-slate-600 cursor-pointer"
                />
                <span className="text-slate-300 group-hover:text-amber-400 transition-colors font-medium">
                  침공 서버 (보스 이름 앞에 '침공' 추가)
                </span>
              </label>
            </div>
            
            <div className="flex justify-center mt-4">
              <button
                onClick={handleAnalyze}
                disabled={files.length === 0 || status.isLoading}
                className={`
                  px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all transform
                  ${files.length === 0 
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:scale-105 hover:shadow-amber-500/25 active:scale-95'
                  }
                  ${status.isLoading ? 'opacity-75 cursor-wait' : ''}
                `}
              >
                {status.isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    정밀 분석 중...
                  </span>
                ) : (
                  "시간표 분석하기"
                )}
              </button>
            </div>
          </section>

          {status.error && (
            <div className="p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-center animate-pulse">
              {status.error}
            </div>
          )}

          {status.success && (
            <BossList 
              schedule={schedule} 
              currentTimeAtAnalysis={analysisTime} 
              isInvasionMode={isInvasionMode}
              notificationPermission={notificationPermission}
              onRequestNotification={requestNotificationPermission}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;