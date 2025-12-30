import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";
import { fileToGenerativePart } from "../utils/fileUtils";

export const analyzeScreenshots = async (
  files: File[],
  currentTime: string
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare interleaved parts
  const parts: any[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const imagePart = await fileToGenerativePart(file);
    
    // Extract time from file.lastModified
    const date = new Date(file.lastModified);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const fileTime = `${hours}:${minutes}:${seconds}`;
    
    parts.push(imagePart);
    parts.push({ 
      text: `[이미지 ${i + 1} 메타데이터] 파일 수정 시간: ${fileTime}. (스크린샷 내에 시계가 보이지 않을 때만 이 시간을 기준 시간으로 사용하세요)` 
    });
  }

  const prompt = `
    당신은 오딘: 발할라 라이징 게임의 보스 시간표를 초 단위까지 계산하는 정밀 계산기입니다.
    
    [1단계: 기준 시간(Current Time) 확정 - 초 단위 필수]
    각 이미지마다 다음 우선순위로 '기준 시간'을 찾으세요.
    1순위: **이미지 내 시계 숫자 (HH:MM:SS)**. 사용자가 초 단위 계산을 위해 초가 포함된 시계를 캡처했습니다. 예를 들어 "14:14:36" 같은 형태를 찾으세요.
    2순위: 이미지 내 시계가 없다면, 제공된 [메타데이터 파일 수정 시간]을 사용.
    
    [2단계: 남은 시간(Remaining Time) 판독]
    보스 목록 옆에 있는 시간 텍스트를 정확히 읽으세요.
    - "05:00:00" -> 5시간 0분 0초
    - "00:39:00" -> 39분 0초
    - "00:00:59" -> 59초
    
    [3단계: 등장 시간(Spawn Time) 계산 - 정밀]
    수식: **기준 시간(HH:MM:SS) + 남은 시간 = 등장 시간(HH:MM:SS)**
    - 초 단위까지 정확히 더하세요.
    - 예: 기준 14:14:36 + 남은시간 00:39:00 = 14:53:36
    - 자정을 넘어가면 24를 뺀 시간을 적으세요 (예: 25:00:10 -> 01:00:10).

    [4단계: 필터링 및 이름 변경]
    - **제외(필수)**: 
      1. "혼돈의 참수자 스네르"
      2. "혼돈의 마수 굴베이그"
      3. "혼돈의 사제 강글로티"
      4. "1일" 이상 남은 보스
      5. "출현 중", "Appearance", "Spawned" 등 이미 등장한 상태인 보스
    
    - **이름 변경(필수)**:
      - "화신 그로아" -> "화신그로아" (띄어쓰기 제거)
      - "분노의 모네가름" -> "지감4층"
      - "나태의 드라우그" -> "지감7층"
      - "기만의 기사 다인홀로크" -> "지감10층"

    [5단계: 정렬]
    - 추출된 모든 보스를 **등장 시간(spawnTime)이 빠른 순서대로(오름차순)** 정렬하세요.

    JSON 형식으로 반환하세요.
    'referenceTime'은 사용된 기준 시간을 "HH:MM:SS" 형식으로 적으세요.
    'spawnTime'도 반드시 "HH:MM:SS" 형식이어야 합니다.
    'remainingTimeText' 필드에는 이미지에서 읽은 원본 시간 텍스트를 적어주세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [...parts, { text: prompt }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            referenceTime: {
              type: Type.STRING,
              description: "The base time used for calculation (e.g. '14:14:36')",
            },
            bosses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  bossName: { type: Type.STRING },
                  remainingTimeText: { 
                    type: Type.STRING,
                    description: "The raw text read from image (e.g. '05:00:00')",
                  },
                  spawnTime: { 
                    type: Type.STRING, 
                    description: "Calculated time HH:MM:SS",
                  },
                },
                required: ["bossName", "spawnTime", "remainingTimeText"],
              },
            },
          },
          required: ["referenceTime", "bosses"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText) as AnalysisResult;
    
    if (!data.bosses) {
        return { referenceTime: "정보 없음", bosses: [] };
    }

    return data;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw new Error("이미지를 분석하는 도중 오류가 발생했습니다.");
  }
};