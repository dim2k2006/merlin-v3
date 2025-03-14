import { Container } from '../container';
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import crypto from 'crypto';
import get from 'lodash/get';

const BodySchema = z.object({
  data: z.object({
    initData: z.string(),
  }),
});

export function makeValidateTelegramHandler(container: Container) {
  return async function validateTelegram(request: HttpRequest): Promise<HttpResponseInit> {
    try {
      const body = await request.json();

      const result = BodySchema.safeParse(body);
      if (!result.success) {
        return { status: 400, body: 'Bad request' };
      }

      const { initData } = result.data.data;

      if (initData.length === 0) {
        return { status: 400, body: 'Bad request' };
      }

      const telegramBotToken = container.config.telegramBotToken;

      const isValid = verifyTelegramInitData(initData, telegramBotToken);
      if (!isValid) {
        return { status: 401, body: 'Unauthorized' };
      }

      // Parse initData to extract user data.
      const params = new URLSearchParams(initData);

      const userData = JSON.parse(params.get('user') ?? '{}');

      const user = {
        id: String(get(userData, 'id', '')),
        first_name: get(userData, 'first_name', ''),
        last_name: get(userData, 'last_name', ''),
        username: get(userData, 'username', ''),
      };

      return { status: 200, jsonBody: user };
    } catch (error) {
      container.exceptionProvider.captureException(error, 'Failed to validate telegram.');

      throw error;
    }
  };
}

function verifyTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);

  // Extract the provided hash.
  const receivedHash = params.get('hash');
  if (!receivedHash) {
    console.error('initData is missing the hash parameter.');
    return false;
  }

  // Remove the hash parameter before creating the data-check-string.
  params.delete('hash');

  // Build data-check-string: sort fields alphabetically and join with '\n'
  const dataCheckArr: string[] = [];
  for (const [key, value] of params.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join('\n');

  // Compute the secret key using HMAC-SHA256 with "WebAppData" as key.
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

  // Compute HMAC-SHA256 of the data-check-string using the secret key.
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return computedHash === receivedHash;
}
