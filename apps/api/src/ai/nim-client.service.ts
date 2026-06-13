import {
  Injectable,
  BadGatewayException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import OpenAI from 'openai';
import type { ZodType } from 'zod';

@Injectable()
export class NimClientService {
  private readonly logger = new Logger(NimClientService.name);
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('AI generation is not configured');
    if (!this.client) {
      this.client = new OpenAI({
        apiKey,
        baseURL: process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
      });
    }
    return this.client;
  }

  get model(): string {
    return process.env.NVIDIA_MODEL ?? 'meta/llama-3.3-70b-instruct';
  }

  /**
   * `semanticCheck` runs after zod parsing; throwing inside it counts as a
   * failed attempt and triggers the single retry with the error fed back.
   */
  async completeJson<T>(
    systemPrompt: string,
    userMessage: string,
    schema: ZodType<T>,
    semanticCheck?: (parsed: T) => void,
  ): Promise<T> {
    const client = this.getClient();

    const attempt = async (extra?: string): Promise<T> => {
      const content = extra ? `${userMessage}\n\nPrevious attempt failed: ${extra}` : userMessage;
      let raw: string;

      try {
        const res = await client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content },
          ],
          temperature: 0.4,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        });
        raw = res.choices[0]?.message?.content ?? '';
      } catch (err: any) {
        if (err?.status === 429) throw new BadGatewayException('AI service rate limit reached — try again shortly');
        throw err;
      }

      // Strip code fences if model ignored the instruction
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(`JSON parse failed: ${raw.slice(0, 200)}`);
      }

      const result = schema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`Schema validation failed: ${result.error.message}`);
      }
      semanticCheck?.(result.data);
      return result.data;
    };

    try {
      return await attempt();
    } catch (firstErr: any) {
      this.logger.warn(`NIM first attempt failed: ${firstErr.message}`);
      // If it's a service-level error, don't retry
      if (firstErr instanceof ServiceUnavailableException || firstErr instanceof BadGatewayException) {
        throw firstErr;
      }
      try {
        return await attempt(firstErr.message);
      } catch (secondErr: any) {
        this.logger.error(`NIM second attempt failed: ${secondErr.message}`);
        if (secondErr instanceof BadGatewayException) throw secondErr;
        throw new BadGatewayException('AI generation failed — please try again later');
      }
    }
  }
}
