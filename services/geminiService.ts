
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Fact, QuizQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let activeAudioSource: AudioBufferSourceNode | null = null;
let activeAudioContext: AudioContext | null = null;

export const getFacts = async (interests: string[], dislikes: string[] = [], randomOnly: boolean = false): Promise<Fact[]> => {
  const modePrompt = randomOnly 
    ? "Generate 10 completely random, interesting facts from different areas of life. Use simple, clear English that a 10 year old would understand."
    : `Generate 10 interesting facts about: ${interests.join(", ")}. Do not use these topics: ${dislikes.join(", ")}. Use simple, clear, and easy English.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${modePrompt} Max 100 characters per fact. Return as a JSON array of {topic, content, sourceName, sourceUrl}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            content: { type: Type.STRING },
            sourceName: { type: Type.STRING },
            sourceUrl: { type: Type.STRING }
          },
          required: ["topic", "content", "sourceName", "sourceUrl"]
        }
      }
    }
  });

  try {
    const rawFacts = JSON.parse(response.text || "[]");
    return rawFacts.map((f: any) => ({
      ...f,
      id: Math.random().toString(36).substr(2, 9),
      liked: false,
      saved: false,
      xpEarned: false
    }));
  } catch (e) {
    return [];
  }
};

export const generateQuiz = async (seenFacts: Fact[], difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Promise<QuizQuestion[]> => {
  if (seenFacts.length < 3) return [];
  const factContext = seenFacts.slice(-15).map(f => f.content).join("\n");
  
  const diffInstructions = {
    easy: "Create 3 very simple questions with obvious answers.",
    medium: "Create 4 slightly challenging questions that require memory of details.",
    hard: "Create 5 difficult questions including tricky distractor options."
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Based on these facts, ${diffInstructions[difficulty]} Use plain English. Return a JSON array of QuizQuestion objects.\nFacts:\n${factContext}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.NUMBER },
            difficulty: { type: Type.STRING }
          },
          required: ["id", "question", "options", "correctIndex", "difficulty"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const stopSpeech = () => {
  if (activeAudioSource) {
    try { activeAudioSource.stop(); } catch(e) {}
    activeAudioSource = null;
  }
};

export const speakFact = async (text: string, voice: 'male' | 'female' = 'female', onStart?: () => void, onEnd?: () => void) => {
  stopSpeech();
  
  if (!activeAudioContext) {
    activeAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }

  onStart?.();
  const voiceName = voice === 'female' ? 'Kore' : 'Fenrir';
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const buffer = await decodeAudioData(decode(base64Audio), activeAudioContext, 24000, 1);
      const source = activeAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(activeAudioContext.destination);
      source.onended = () => {
        onEnd?.();
        if (activeAudioSource === source) activeAudioSource = null;
      };
      source.start(0);
      activeAudioSource = source;
    } else {
      onEnd?.();
    }
  } catch (e) {
    onEnd?.();
  }
};

function decode(b64: string) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, rate: number, ch: number): Promise<AudioBuffer> {
  const d16 = new Int16Array(data.buffer);
  const fCount = d16.length / ch;
  const buffer = ctx.createBuffer(ch, fCount, rate);
  for (let c = 0; c < ch; c++) {
    const channelData = buffer.getChannelData(c);
    for (let i = 0; i < fCount; i++) channelData[i] = d16[i * ch + c] / 32768.0;
  }
  return buffer;
}
