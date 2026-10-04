import { Platform } from 'react-native';

import { auth } from '@/config/firebase';
import type {
  ExtractedNutritionLabel,
  NutritionLabelImage,
} from '@/types/nutrition-label';

const EXTRACTION_TIMEOUT_MS = 45_000;
const RESPONSE_FIELDS = [
  'foodName',
  'servingSize',
  'calories',
  'protein',
  'carbohydrates',
  'fat',
  'sugar',
  'sodium',
  'fiber',
] as const;

type ApiErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

export class NutritionLabelExtractionError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(message: string, code = 'extraction_failed', status: number | null = null) {
    super(message);
    this.name = 'NutritionLabelExtractionError';
    this.code = code;
    this.status = status;
  }
}

export class NutritionLabelAuthenticationError extends NutritionLabelExtractionError {
  constructor(message = 'Please log in again before scanning a label.') {
    super(message, 'authentication_required', 401);
    this.name = 'NutritionLabelAuthenticationError';
  }
}

export class InvalidNutritionLabelExtractionResponseError extends NutritionLabelExtractionError {
  constructor() {
    super(
      'The extraction service returned invalid data. Try again or review the label manually.',
      'invalid_extraction_response',
    );
    this.name = 'InvalidNutritionLabelExtractionResponseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatedText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function validatedNutritionNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/** Invalid fields become null; malformed top-level payloads are rejected. */
export function validateNutritionLabelExtractionResponse(
  value: unknown,
): ExtractedNutritionLabel {
  if (
    !isRecord(value) ||
    RESPONSE_FIELDS.some((field) => !Object.prototype.hasOwnProperty.call(value, field))
  ) {
    throw new InvalidNutritionLabelExtractionResponseError();
  }

  return {
    foodName: validatedText(value.foodName),
    servingSize: validatedText(value.servingSize),
    calories: validatedNutritionNumber(value.calories),
    protein: validatedNutritionNumber(value.protein),
    carbohydrates: validatedNutritionNumber(value.carbohydrates),
    fat: validatedNutritionNumber(value.fat),
    sugar: validatedNutritionNumber(value.sugar),
    sodium: validatedNutritionNumber(value.sodium),
    fiber: validatedNutritionNumber(value.fiber),
  };
}

function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_NUTRIVO_AI_URL?.trim();
  const fallbackUrl = Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000';
  return (configuredUrl || fallbackUrl).replace(/\/+$/, '');
}

function inferMimeType(image: NutritionLabelImage): string {
  const declared = image.mimeType?.toLowerCase();
  if (declared === 'image/jpeg' || declared === 'image/png' || declared === 'image/webp') {
    return declared;
  }

  const reference = `${image.fileName ?? ''} ${image.uri}`.toLowerCase();
  if (reference.includes('image/png') || reference.match(/\.png(?:$|[?#\s])/)) {
    return 'image/png';
  }
  if (reference.includes('image/webp') || reference.match(/\.webp(?:$|[?#\s])/)) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function imageFileName(image: NutritionLabelImage, mimeType: string): string {
  const providedName = image.fileName?.split(/[\\/]/).pop()?.trim();
  if (providedName) return providedName;
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return `nutrition-label.${extension}`;
}

async function appendImage(formData: FormData, image: NutritionLabelImage): Promise<void> {
  let mimeType = inferMimeType(image);
  let fileName = imageFileName(image, mimeType);

  if (Platform.OS === 'web') {
    const imageResponse = await fetch(image.uri);
    if (!imageResponse.ok) throw new Error('The selected image could not be read.');
    const blob = await imageResponse.blob();
    if (blob.type === 'image/jpeg' || blob.type === 'image/png' || blob.type === 'image/webp') {
      mimeType = blob.type;
      fileName = imageFileName(image, mimeType);
    }
    formData.append('image', blob, fileName);
    return;
  }

  const nativeImage = { uri: image.uri, name: fileName, type: mimeType };
  formData.append('image', nativeImage as unknown as Blob);
}

function controlledServerError(payload: unknown, status: number): NutritionLabelExtractionError {
  const errorPayload = isRecord(payload) ? (payload as ApiErrorPayload).error : undefined;
  const code = typeof errorPayload?.code === 'string' ? errorPayload.code : 'extraction_failed';
  const message =
    typeof errorPayload?.message === 'string'
      ? errorPayload.message
      : 'Nutrition extraction failed. Try again or review the label manually.';

  if (status === 401) return new NutritionLabelAuthenticationError(message);
  return new NutritionLabelExtractionError(message, code, status);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export interface NutritionLabelExtractionService {
  extract(image: NutritionLabelImage): Promise<ExtractedNutritionLabel>;
}

export const nutritionLabelExtractionService: NutritionLabelExtractionService = {
  async extract(image) {
    const user = auth.currentUser;
    if (!user) throw new NutritionLabelAuthenticationError();

    let token: string;
    try {
      token = await user.getIdToken();
    } catch {
      throw new NutritionLabelAuthenticationError(
        'Your session could not be verified. Check your connection and log in again.',
      );
    }

    const formData = new FormData();
    try {
      await appendImage(formData, image);
    } catch {
      throw new NutritionLabelExtractionError(
        'The selected image could not be prepared. Choose another image or enter manually.',
        'image_preparation_failed',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXTRACTION_TIMEOUT_MS);

    try {
      const response = await fetch(`${getApiBaseUrl()}/extract-nutrition-label`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });
      const payload = await readJson(response);
      if (!response.ok) throw controlledServerError(payload, response.status);
      return validateNutritionLabelExtractionResponse(payload);
    } catch (error) {
      if (error instanceof NutritionLabelExtractionError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NutritionLabelExtractionError(
          'Nutrition extraction timed out. Try again or review the label manually.',
          'client_timeout',
        );
      }
      throw new NutritionLabelExtractionError(
        'The extraction service could not be reached. Check the backend URL and your connection.',
        'network_error',
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};
