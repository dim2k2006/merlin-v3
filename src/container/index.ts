import { EmbeddingProvider, EmbeddingProviderOpenAI } from '../providers/embedding';
import { LlmProvider, LlmProviderOpenai } from '../providers/llm';
import { AgentProvider, AgentProviderLangGraph } from '../providers/agent';
import { ParameterProvider, ParameterProviderCorrelate } from '../providers/parameter';
import { ChatProvider, ChatProviderTelegram } from '../providers/chat';
import { UserRepositorySupabase, UserService, UserServiceImpl } from '../domain/user';
import { MemoryRepositoryPinecone, MemoryService, MemoryServiceImpl } from '../domain/memory';

function getEnvVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function buildConfig(): Config {
  const supabaseUrl = getEnvVariable('SUPABASE_URL');
  const supabaseKey = getEnvVariable('SUPABASE_KEY');
  const pineconeApiKey = getEnvVariable('PINECONE_API_KEY');
  const openaiApiKey = getEnvVariable('OPENAI_API_KEY');
  const telegramBotToken = getEnvVariable('TELEGRAM_BOT_TOKEN');
  const sentryDsn = getEnvVariable('SENTRY_DSN');
  const correlateApiKey = getEnvVariable('CORRELATE_API_KEY');
  const correlateWebAppUrl = getEnvVariable('CORRELATE_WEB_APP_URL');

  return {
    supabaseUrl,
    supabaseKey,
    pineconeApiKey,
    pineconeNamespace: 'ns1',
    pineconeIndexName: 'merlin',
    openaiApiKey,
    telegramBotToken,
    allowedTelegramUserIds: [284307817, 263786736],
    sentryDsn,
    correlateApiKey,
    correlateWebAppUrl,
  };
}

export type Config = {
  supabaseUrl: string;
  supabaseKey: string;
  pineconeApiKey: string;
  pineconeNamespace: string;
  pineconeIndexName: string;
  openaiApiKey: string;
  telegramBotToken: string;
  allowedTelegramUserIds: number[];
  sentryDsn: string;
  correlateApiKey: string;
  correlateWebAppUrl: string;
};

export function buildContainer(config: Config): Container {
  const embeddingProvider = new EmbeddingProviderOpenAI({ apiKey: config.openaiApiKey });
  const llmProvider = new LlmProviderOpenai({ apiKey: config.openaiApiKey });

  const userRepository = new UserRepositorySupabase({
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
  });
  const userService = new UserServiceImpl({ userRepository });

  const memoryRepository = new MemoryRepositoryPinecone({
    apiKey: config.pineconeApiKey,
    namespace: config.pineconeNamespace,
    indexName: config.pineconeIndexName,
  });
  const memoryService = new MemoryServiceImpl({ memoryRepository, embeddingProvider, llmProvider });

  const parameterProvider = new ParameterProviderCorrelate({ apiKey: config.correlateApiKey });

  const agentProvider = new AgentProviderLangGraph({ apiKey: config.openaiApiKey, memoryService, parameterProvider });

  const chatProvider = new ChatProviderTelegram({ botToken: config.telegramBotToken });

  return {
    config,
    userService,
    memoryService,
    embeddingProvider,
    llmProvider,
    agentProvider,
    parameterProvider,
    chatProvider,
  };
}

export type Container = {
  config: Config;
  userService: UserService;
  memoryService: MemoryService;
  embeddingProvider: EmbeddingProvider;
  llmProvider: LlmProvider;
  agentProvider: AgentProvider;
  parameterProvider: ParameterProvider;
  chatProvider: ChatProvider;
};
