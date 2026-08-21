import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiQuotaError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds = 13) {
    super(message);
    this.name = 'GeminiQuotaError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[DOCUSURE AI Error] GEMINI_API_KEY is not set in environment variables.');
  }
  return new GoogleGenerativeAI(apiKey);
}

export interface GeminiStructuredOutputOptions<T> {
  prompt: string;
  systemInstruction?: string;
  schema?: unknown;
  temperature?: number;
  modelName?: string;
}

function parseRetryDelay(errorMsg: string): number {
  const match = errorMsg.match(/retryDelay:\s*approximately\s*(\d+)\s*second/i) ||
                errorMsg.match(/retry\s*after\s*(\d+)\s*second/i) ||
                errorMsg.match(/(\d+)\s*seconds/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 13;
}

let globalSDKCallCounter = 0;

export async function callGeminiStructured<T>(
  options: GeminiStructuredOutputOptions<T>
): Promise<{ rawText: string; parsed: T | null }> {
  const ai = getGeminiClient();
  const selectedModel = options.modelName || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  let retryCount = 0;

  const executeCall = async (): Promise<{ rawText: string; parsed: T | null }> => {
    globalSDKCallCounter++;
    console.log(`[DOCUSURE AI] GEMINI SDK generateContent CALL #${globalSDKCallCounter} (Model: ${selectedModel})`);

    const model = ai.getGenerativeModel({
      model: selectedModel,
      systemInstruction: options.systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: options.temperature ?? 0.0,
      },
    });

    const result = await model.generateContent(options.prompt);
    const rawText = result.response.text();

    try {
      const parsed = JSON.parse(rawText) as T;
      return { rawText, parsed };
    } catch {
      console.error('[DOCUSURE AI] Failed to parse JSON response from Gemini');
      return { rawText, parsed: null };
    }
  };

  try {
    return await executeCall();
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const is429 = errorMsg.includes('429') ||
                  errorMsg.includes('Quota exceeded') ||
                  errorMsg.includes('RESOURCE_EXHAUSTED') ||
                  errorMsg.includes('Too Many Requests');

    if (is429) {
      retryCount++;
      const delaySec = parseRetryDelay(errorMsg);
      console.warn(`[DOCUSURE AI] 429 Quota Exceeded (Retry Count: ${retryCount}). Retrying in ${delaySec}s...`);

      await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));

      try {
        console.log(`[DOCUSURE AI] Executing rate-limit retry #${retryCount}...`);
        return await executeCall();
      } catch (retryError: unknown) {
        const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
        console.error(`[DOCUSURE AI] Rate-limit retry #${retryCount} failed: ${retryMsg}`);
        throw new GeminiQuotaError(
          `Gemini API rate limit exceeded (429). Please wait ${delaySec} seconds.`,
          delaySec
        );
      }
    }

    console.error('[DOCUSURE AI] Gemini API call failed:', error);
    throw error;
  }
}
