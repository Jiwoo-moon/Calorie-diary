import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

const PROMPT_TEXT = `이 음식 사진을 분석해 줘.
응답은 반드시 아래 JSON 형식으로만 답해 줘. 다른 말은 하지 마.

{
  "food_name": "음식 이름 (한국어)",
  "calories": 예상 칼로리 숫자 (정수),
  "carbs": 탄수화물 그램 수 (정수),
  "protein": 단백질 그램 수 (정수),
  "fat": 지방 그램 수 (정수)
}`;

export interface ParsedFoodAnalysis {
  food_name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

function parseFoodAnalysisJson(rawText: string): ParsedFoodAnalysis {
  try {
    let cleaned = (rawText || '').trim();

    // Remove markdown code fences if present
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    } else {
      // Find the first { and last }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
    }

    // Normalize curly quotes to standard quotes
    const normalized = cleaned
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"');

    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== 'object') {
      return { food_name: '분석 실패', calories: 0, carbs: 0, protein: 0, fat: 0 };
    }

    const foodName =
      typeof parsed.food_name === 'string' && parsed.food_name.trim()
        ? parsed.food_name.trim()
        : '분석 실패';

    const parseNum = (val: any) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.round(num));
    };

    return {
      food_name: foodName,
      calories: parseNum(parsed.calories),
      carbs: parseNum(parsed.carbs),
      protein: parseNum(parsed.protein),
      fat: parseNum(parsed.fat),
    };
  } catch (err) {
    console.warn('JSON parsing failed, falling back to default:', err);
    return {
      food_name: '분석 실패',
      calories: 0,
      carbs: 0,
      protein: 0,
      fat: 0,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, mimeType = 'image/jpeg', geminiKey: customKey } = body || {};

    // 1. 이미지가 없는 경우 400 에러 반환
    if (!image || typeof image !== 'string' || !image.trim()) {
      return NextResponse.json(
        { error: '이미지가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // Clean base64 string if it contains data URI prefix
    let base64Data = image.trim();
    let detectedMime = mimeType;
    if (base64Data.startsWith('data:')) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        base64Data = match[2];
      }
    }

    // 2. 이미지 용량 체크 (4MB 초과 시 400 에러 반환)
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const byteLength = imageBuffer.length;

    if (byteLength === 0) {
      return NextResponse.json(
        { error: '이미지 데이터가 비어 있습니다.' },
        { status: 400 }
      );
    }

    if (byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        {
          error: `이미지 용량이 4MB를 초과합니다. (현재 크기: ${(
            byteLength /
            (1024 * 1024)
          ).toFixed(2)}MB)`,
        },
        { status: 400 }
      );
    }

    // API Key 결정
    const headerKey = req.headers.get('x-gemini-key');
    const apiKey =
      customKey ||
      headerKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Gemini API 키가 설정되지 않았습니다. .env.local 파일에 GEMINI_API_KEY를 추가하거나 설정창에서 API 키를 입력해 주세요.',
        },
        { status: 401 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    let resultText = '';
    let lastError: any = null;

    // Fast and stable model hierarchy:
    // gemini-3.5-flash-lite is highest-availability and fast for multimodal vision
    // gemini-3.8-flash is balanced multimodal
    // gemini-3.1-flash-lite is high-frequency fallback
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
    ];

    for (const model of candidateModels) {
      try {
        console.log(`[analyze] Attempting analysis with model: ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: detectedMime,
              },
            },
            PROMPT_TEXT,
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response && response.text) {
          resultText = response.text;
          console.log(`[analyze] Successfully generated content with ${model}`);
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        const msg = modelErr?.message || String(modelErr);
        console.warn(`[analyze] Model ${model} failed (${modelErr?.status || msg.substring(0, 100)}), trying next fallback...`);
      }
    }

    // If models.generateContent all failed, try interactions API as a last resort
    if (!resultText) {
      for (const model of ['gemini-3.5-flash-lite', 'gemini-3.8-flash']) {
        try {
          console.log(`[analyze] Trying interactions API with ${model}...`);
          const interaction = await ai.interactions.create({
            model,
            input: [
              {
                type: 'text',
                text: PROMPT_TEXT,
              },
              {
                type: 'image',
                data: base64Data,
                mime_type: detectedMime,
              },
            ],
            response_format: [
              {
                type: 'text',
                mime_type: 'application/json',
              },
            ],
          });

          if (interaction && interaction.output_text) {
            resultText = interaction.output_text;
            console.log(`[analyze] Successfully analyzed with interactions (${model})`);
            break;
          }
        } catch (interactionErr: any) {
          lastError = interactionErr;
          console.warn(`[analyze] Interactions API with ${model} failed:`, interactionErr?.message);
        }
      }
    }

    if (!resultText) {
      console.error('[analyze] All Gemini models failed. Last error:', lastError);
      let userFriendlyMsg = '구글 Gemini AI 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주시거나 아래에서 직접 음식명을 입력해 주세요.';

      const errStr = lastError?.message || String(lastError || '');
      if (errStr.includes('API_KEY_INVALID') || errStr.includes('invalid api key')) {
        userFriendlyMsg = 'Gemini API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.';
      } else if (errStr.includes('QUOTA_EXCEEDED') || errStr.includes('429')) {
        userFriendlyMsg = 'Gemini API 호출 한도(Quota)가 초과되었습니다. 잠시 후 다시 시도해 주세요.';
      } else if (errStr.includes('503') || errStr.includes('high demand') || errStr.includes('UNAVAILABLE')) {
        userFriendlyMsg = '현재 구글 AI 서버 사용량이 급증하여 일시적인 지연이 발생했습니다. 잠시 후 다시 시도해 주세요.';
      }

      return NextResponse.json(
        {
          error: userFriendlyMsg,
          // Even on error, provide default zero values so client form doesn't break
          food_name: '분석 실패',
          calories: 0,
          carbs: 0,
          protein: 0,
          fat: 0,
        },
        { status: 500 }
      );
    }

    // 3. JSON 파싱 처리 (실패 시 기본값 반환)
    const parsedData = parseFoodAnalysisJson(resultText);

    return NextResponse.json({
      success: true,
      food_name: parsedData.food_name,
      calories: parsedData.calories,
      carbs: parsedData.carbs,
      protein: parsedData.protein,
      fat: parsedData.fat,
      analysis: {
        food_name: parsedData.food_name,
        calories: parsedData.calories,
        carbs: parsedData.carbs,
        protein: parsedData.protein,
        fat: parsedData.fat,
        meal_type: '점심',
        description: '',
      },
    });
  } catch (error: unknown) {
    console.error('Error analyzing food image:', error);
    const errorMessage =
      error instanceof Error ? error.message : '음식 사진 분석 중 알 수 없는 오류가 발생했습니다.';

    let userFriendlyMsg = errorMessage;
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid api key')) {
      userFriendlyMsg = 'Gemini API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.';
    } else if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('429')) {
      userFriendlyMsg = 'Gemini API 호출 한도(Quota)가 초과되었습니다. 잠시 후 다시 시도해 주세요.';
    } else if (errorMessage.includes('fetch failed') || errorMessage.includes('SocketError') || errorMessage.includes('UND_ERR_SOCKET')) {
      userFriendlyMsg = '구글 AI 서버와의 통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.';
    }

    return NextResponse.json(
      {
        error: userFriendlyMsg,
        food_name: '분석 실패',
        calories: 0,
        carbs: 0,
        protein: 0,
        fat: 0,
      },
      { status: 500 }
    );
  }
}
