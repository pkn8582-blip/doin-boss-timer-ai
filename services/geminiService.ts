import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { AnalysisResult } from "../types";
import { fileToGenerativePart } from "../utils/fileUtils";

export const analyzeScreenshots = async (
  files: File[],
  currentTime: string,
  retryCount = 1
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const parts: any[] = [];
  for (let i = 0; i < files.length; i++) {
    const imagePart = await fileToGenerativePart(files[i]);
    const date = new Date(files[i].lastModified);
    const fileTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    
    parts.push(imagePart);
    parts.push({ text: `[Img ${i + 1}] Modified: ${fileTime}` });
  }

  const prompt = `
    Odin Boss Calculator. System Time: ${currentTime}
    
    [CRITICAL INSTRUCTIONS]
    1. Accuracy is the absolute priority. You must calculate the exact seconds.
    2. Find 'Reference Time' (HH:MM:SS) from the in-game clock (usually top-left). This is the most accurate sync point. If not visible, use the provided file modification time.
    3. Read 'Remaining Time' (HH:MM:SS) for each boss precisely as shown in the image.
    4. Calculate 'Spawn Time' = Reference Time + Remaining Time. 
       - Perform this as a strict mathematical addition of time.
       - Example: If Reference is 12:00:05 and Remaining is 00:10:10, Spawn is 12:10:15.
    5. Do not round seconds. If the image shows 45 seconds, use 45 seconds.
    6. Scan all images thoroughly. Do not skip any bosses.
    
    [BOSS LIST RULES]
    - INCLUDE: "굴베이그", "호드", "헤이드", "대교주프레이", "이미르" and others.
    - EXCLUDE: "혼돈의마수 굴베이그", "스네르", "강글로티", "1일 이상", "출현 중"(Except Blessed bosses).
    - RENAME: 
      "브린힐드" -> "브륀힐드"
      "대교주 프레이" -> "대교주프레이"
      "화신 그로아" -> "화신그로아"
      "분노의 모네가름" -> "지감4층"
      "나태의 드라우그" -> "지감7층"
      "기만의 기사 다인홀로크" -> "지감10층"
      "축복받은 X" -> "X"
      
    Return JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [...parts, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            referenceTime: { type: Type.STRING },
            bosses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  bossName: { type: Type.STRING },
                  remainingTimeText: { type: Type.STRING },
                  spawnTime: { type: Type.STRING },
                },
                required: ["bossName", "spawnTime", "remainingTimeText"],
              },
            },
          },
          required: ["referenceTime", "bosses"],
        },
      },
    });

    let jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");
    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const data = JSON.parse(jsonText) as AnalysisResult;
    if (!data.bosses || !Array.isArray(data.bosses)) {
      return { referenceTime: data.referenceTime || "정보 없음", bosses: [] };
    }
    return data;

  } catch (error: any) {
    if (retryCount > 0) {
      console.log(`Retrying analysis... (${retryCount} left)`);
      return analyzeScreenshots(files, currentTime, retryCount - 1);
    }
    console.error("Gemini Analysis Failed:", error);
    
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("API 키가 유효하지 않습니다.");
    }
    if (error.message?.includes("quota")) {
      throw new Error("API 사용량이 초과되었습니다.");
    }
    
    throw new Error(`분석 실패: ${error.message || "알 수 없는 오류"}. 다시 시도해주세요.`);
  }
};
