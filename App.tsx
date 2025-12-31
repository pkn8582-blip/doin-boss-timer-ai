import React, { useState } from 'react';
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
  
  const [status, setStatus] = useState<ProcessingState>({
    isLoading: false,
    error: null,
    success: false,
  });

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    // Reset previous results when new files are added if desired, or keep them until analyze is clicked
    if (selectedFiles.length === 0) {
        setSchedule([]);
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
      
      // We pass the system time, but the service will try to find the time in the screenshot first
      const result = await analyzeScreenshots(files, systemTime);
      
      // Determine reference time for sorting (fallback to systemTime if result is invalid)
      // Accept HH:MM or HH:MM:SS
      const refTimeStr = result.referenceTime.match(/^\d{1,2}:\d{2}(:\d{2})?$/) 
        ? result.referenceTime 
        : systemTime;

      // Sort bosses by spawn time (in seconds)
      const getSeconds = (timeStr: string) => {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 0) return 0;
        
        let totalSeconds = 0;
        // HH
        if (parts.length >= 1) totalSeconds += parts[0] * 3600;
        // MM
        if (parts.length >= 2) totalSeconds += parts[1] * 60;
        // SS
        if (parts.length >= 3) totalSeconds += parts[2];
        
        return totalSeconds;
      };

      const refSeconds = getSeconds(refTimeStr);

      const sortedBosses = [...result.bosses].sort((a, b) => {
        let secA = getSeconds(a.spawnTime);
        let secB = getSeconds(b.spawnTime);

        // If spawn time is earlier than reference time (e.g. Ref 23:00, Spawn 01:00), 
        // treat it as next day (+24h = +86400s)
        if (secA < refSeconds) secA += 86400;
        if (secB < refSeconds) secB += 86400;

        return secA - secB;
      });
      
      setSchedule(sortedBosses);
      setAnalysisTime(result.referenceTime); // Use the time determined by the AI
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
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;