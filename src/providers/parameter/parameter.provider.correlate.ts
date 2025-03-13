import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { z } from 'zod';
import {
  ParameterProvider,
  CreateParameterInput,
  Parameter,
  CreateMeasurementInput,
  Measurement,
  User,
} from './parameter.provider';
import { handleAxiosError } from '../../utils/axios';

const ParameterResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string(),
  dataType: z.enum(['float']),
  unit: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const UserResponseSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const BaseMeasurementSchema = z.object({
  type: z.literal('float'), // MeasurementType is only 'float'
  id: z.string(),
  userId: z.string(),
  parameterId: z.string(),
  timestamp: z.string(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// MeasurementFloat schema extends BaseMeasurementSchema with a value property.
const MeasurementFloatSchema = BaseMeasurementSchema.extend({
  value: z.number(),
});

// Since Measurement is only defined as MeasurementFloat, we export it as MeasurementSchema.
const MeasurementResponseSchema = MeasurementFloatSchema;

type ConstructorInput = {
  apiKey: string;
};

class ParameterProviderCorrelate implements ParameterProvider {
  private readonly apiKey: string;

  private readonly client: AxiosInstance;

  private readonly baseUrl: string;

  constructor({ apiKey }: ConstructorInput) {
    this.apiKey = apiKey;

    const baseURL = 'https://correlateapp-be.onrender.com';

    this.baseUrl = baseURL;

    this.client = axios.create({
      baseURL,
    });

    this.client.interceptors.request.use((config) => {
      // Determine the payload string:
      let payload = '';
      const method = config.method?.toUpperCase();
      if (method === 'POST' || method === 'PUT') {
        // If the data is an object, JSON-stringify it; otherwise, use it as is.
        payload = config.data ? JSON.stringify(config.data) : '';
      }
      // For GET/DELETE, payload is an empty string (or you can use the query string if needed).

      // Generate auth headers
      const authHeaders = this.attachAuthHeaders(payload);

      // Attach the headers to the request
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      config.headers = {
        ...config.headers,
        ...authHeaders,
      };

      return config;
    });
  }

  async getUserByExternalId(externalId: string): Promise<User> {
    const url = `/api/users/external/${externalId}`;

    try {
      const response = await this.client.get(url);

      const result = UserResponseSchema.parse(response.data);

      return result;
    } catch (error) {
      return handleAxiosError(error, `${this.baseUrl}${url}`);
    }
  }

  async createParameter(input: CreateParameterInput): Promise<Parameter> {
    const url = '/api/parameters';

    try {
      const response = await this.client.post(url, {
        userId: input.userId,
        name: input.name,
        description: input.description,
        dataType: input.dataType,
        unit: input.unit,
      });

      const result = ParameterResponseSchema.parse(response.data);

      return result;
    } catch (error) {
      return handleAxiosError(error, `${this.baseUrl}${url}`);
    }
  }

  async listParametersByUser(userId: string): Promise<Parameter[]> {
    const url = `/api/parameters/user/${userId}`;

    try {
      const response = await this.client.get(url);

      const result = z.array(ParameterResponseSchema).parse(response.data);

      return result;
    } catch (error) {
      return handleAxiosError(error, `${this.baseUrl}${url}`);
    }
  }

  async createMeasurement(input: CreateMeasurementInput): Promise<Measurement> {
    const url = '/api/measurements';

    try {
      const response = await this.client.post(url, {
        parameterId: input.parameterId,
        notes: input.notes,
        value: input.value,
      });

      const result = MeasurementResponseSchema.parse(response.data);

      return result;
    } catch (error) {
      return handleAxiosError(error, `${this.baseUrl}${url}`);
    }
  }

  async listMeasurementsByParameter(parameterId: string): Promise<Measurement[]> {
    const url = `/api/measurements/parameter/${parameterId}`;

    try {
      const response = await this.client.get(url);

      const result = z.array(MeasurementResponseSchema).parse(response.data);

      return result;
    } catch (error) {
      return handleAxiosError(error, `${this.baseUrl}${url}`);
    }
  }

  private attachAuthHeaders(payload: string) {
    const timestamp = Math.floor(Date.now() / 1000); // current Unix timestamp in seconds
    const signature = this.computeHMAC(payload, timestamp);
    return {
      'X-Timestamp': timestamp.toString(),
      'X-Signature': signature,
    };
  }

  private computeHMAC(payload: string, timestamp: number) {
    const message = `${payload}|${timestamp}`;
    const hmac = crypto.createHmac('sha256', this.apiKey);
    hmac.update(message);
    return hmac.digest('base64');
  }
}

export default ParameterProviderCorrelate;
