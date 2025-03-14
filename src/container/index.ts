import { CosmosClient } from '@azure/cosmos';
import { QueueServiceClient } from '@azure/storage-queue';
import { EmbeddingProvider, EmbeddingProviderOpenAI } from '../providers/embedding';
import { LlmProvider, LlmProviderOpenai } from '../providers/llm';
import { AgentProvider, AgentProviderLangGraph } from '../providers/agent';
import { ParameterProvider, ParameterProviderCorrelate } from '../providers/parameter';
import { ChatProvider, ChatProviderTelegram } from '../providers/chat';
import { ExceptionProvider, ExceptionProviderSentry } from '../providers/exception';
import { QueueProvider, QueueProviderAzure } from '../providers/queue';
import { TextCleanerProvider, TextCleanerProviderLlm } from '../providers/textCleaner';
import { UserRepositoryCosmosDb, UserService, UserServiceImpl } from '../domain/user';
import { MemoryRepositoryPinecone, MemoryService, MemoryServiceImpl } from '../domain/memory';

function getEnvVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function buildConfig(): Config {
  const nodeEnv = getEnvVariable('NODE_ENV');
  const storageConnectionString = getEnvVariable('AZURE_STORAGE_CONNECTION_STRING');
  const queueName = getEnvVariable('AZURE_STORAGE_QUEUE_NAME');
  const cosmosDbEndpoint = getEnvVariable('COSMOS_DB_ENDPOINT');
  const cosmosDbKey = getEnvVariable('COSMOS_DB_KEY');
  const pineconeApiKey = getEnvVariable('PINECONE_API_KEY');
  const openaiApiKey = getEnvVariable('OPENAI_API_KEY');
  const telegramBotToken = getEnvVariable('TELEGRAM_BOT_TOKEN');
  const sentryDsn = getEnvVariable('SENTRY_DSN');
  const sentryEnabled = nodeEnv === 'production';
  const correlateApiKey = getEnvVariable('CORRELATE_API_KEY');
  const correlateWebAppUrl = getEnvVariable('CORRELATE_WEB_APP_URL');

  return {
    storageConnectionString,
    queueName,
    cosmosDbEndpoint,
    cosmosDbKey,
    cosmosDbName: 'merlin',
    pineconeApiKey,
    pineconeNamespace: 'ns1',
    pineconeIndexName: 'merlin',
    openaiApiKey,
    telegramBotToken,
    allowedTelegramUserIds: [284307817, 263786736],
    sentryDsn,
    sentryEnabled,
    correlateApiKey,
    correlateWebAppUrl,
  };
}

export type Config = {
  storageConnectionString: string;
  queueName: string;
  cosmosDbEndpoint: string;
  cosmosDbKey: string;
  cosmosDbName: string;
  pineconeApiKey: string;
  pineconeNamespace: string;
  pineconeIndexName: string;
  openaiApiKey: string;
  telegramBotToken: string;
  allowedTelegramUserIds: number[];
  sentryDsn: string;
  sentryEnabled: boolean;
  correlateApiKey: string;
  correlateWebAppUrl: string;
};

export function buildContainer(config: Config): Container {
  const cosmosClient = new CosmosClient({ endpoint: config.cosmosDbEndpoint, key: config.cosmosDbKey });
  const cosmosDatabase = cosmosClient.database(config.cosmosDbName);

  const embeddingProvider = new EmbeddingProviderOpenAI({ apiKey: config.openaiApiKey });
  const llmProvider = new LlmProviderOpenai({ apiKey: config.openaiApiKey });

  const userRepository = new UserRepositoryCosmosDb({
    container: cosmosDatabase.container('Users'),
  });
  const userService = new UserServiceImpl({ userRepository });

  const memoryRepository = new MemoryRepositoryPinecone({
    apiKey: config.pineconeApiKey,
    namespace: config.pineconeNamespace,
    indexName: config.pineconeIndexName,
  });
  const memoryService = new MemoryServiceImpl({ memoryRepository, embeddingProvider, llmProvider });

  const parameterProvider = new ParameterProviderCorrelate({ apiKey: config.correlateApiKey });

  const textCleanerProvider = new TextCleanerProviderLlm({ llmProvider });

  const agentProvider = new AgentProviderLangGraph({
    apiKey: config.openaiApiKey,
    memoryService,
    parameterProvider,
    textCleanerProvider,
  });

  const chatProvider = new ChatProviderTelegram({ botToken: config.telegramBotToken });

  const exceptionProvider = new ExceptionProviderSentry();

  const queueServiceClient = QueueServiceClient.fromConnectionString(config.storageConnectionString);
  const queueClient = queueServiceClient.getQueueClient(config.queueName);

  const queueProvider = new QueueProviderAzure({ client: queueClient });

  return {
    config,
    userService,
    memoryService,
    embeddingProvider,
    llmProvider,
    agentProvider,
    parameterProvider,
    chatProvider,
    exceptionProvider,
    queueProvider,
    textCleanerProvider,
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
  exceptionProvider: ExceptionProvider;
  queueProvider: QueueProvider;
  textCleanerProvider: TextCleanerProvider;
};
