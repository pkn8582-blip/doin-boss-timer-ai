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
    1. Find 'Reference Time' (HH:MM:SS) from image clock or metadata.
    2. Read 'Remaining Time' (HH:MM:SS).
    3. Calculate 'Spawn Time' = Reference + Remaining.
    4. Exclude: "혼돈의마수 굴베이그", "스네르", "강글로티", "1일 이상", "출현 중"(Except Blessed bosses).
    5. Rename: "브린힐드"->"브륀힐드", "화신 그로아"->"화신그로아", "분노의 모네가름"->"지감4층", "나태의 드라우그"->"지감7층", "기만의 기사 다인홀로크"->"지감10층", "축복받은 X"->"X".
    Return JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [...parts, { text: prompt }] },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
