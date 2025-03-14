import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { MemoryService } from '../../domain/memory';
import { ParameterProvider } from '../../shared/parameter.types';
import { TextCleanerProvider } from '../../shared/textCleaner.types';
import {
  AgentProvider,
  AgentInvokeInput,
  AgentInvokeOptions,
  AgentResponse,
  BuildChatMessageInput,
  ChatMessage,
} from './agent.provider';

type ConstructorInput = {
  apiKey: string;
  memoryService: MemoryService;
  parameterProvider: ParameterProvider;
  textCleanerProvider: TextCleanerProvider;
};

class AgentProviderLangGraph implements AgentProvider {
  private agent: ReturnType<typeof createReactAgent>;

  private memoryService: MemoryService;

  private parameterProvider: ParameterProvider;

  private textCleanerProvider: TextCleanerProvider;

  constructor({ apiKey, memoryService, parameterProvider, textCleanerProvider }: ConstructorInput) {
    this.memoryService = memoryService;

    this.parameterProvider = parameterProvider;

    this.textCleanerProvider = textCleanerProvider;

    const agentTools = this.buildTools();
    const agentModel = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0, apiKey });
    const agentCheckpointer = new MemorySaver();

    this.agent = createReactAgent({
      llm: agentModel,
      tools: agentTools,
      checkpointSaver: agentCheckpointer,
      prompt: new SystemMessage({
        content: `
You are a retrieval-based assistant with the following tools:
1) saveMemory: use it to save new pieces of user memory
2) retrieveMemories: use it to retrieve previously saved data
3) getParameterServiceUser: use it to retrieve a user from the parameter service
4) createParameter: use it to create a new parameter in the parameter service
5) listMyParameters: use it to list all parameters for the current user
6) createMeasurement: use it to create a new measurement for a specified parameter
7) listMeasurementsByParameter: use it to list all measurements for a given parameter

POLICY:
1) If the user asks any factual question or requests data that might exist in memory or parameters, you MUST first try the relevant tools (e.g. retrieveMemories, listMyParameters, etc.).
2) If you find relevant data from the tools, use it to form your final answer.
3) Only if the user explicitly requests a creative opinion/story OR the tools return no relevant data, you may generate an answer from your own knowledge.
4) Do not invent data that could be retrieved via a tool.
5) In your final answer, add "Tools Used:" plus any tools actually used. If no tools were used, write "none".
`,
      }),
    });
  }

  async invoke(input: AgentInvokeInput, options?: AgentInvokeOptions): Promise<AgentResponse> {
    const userInfoMessage = this.buildChatMessage({
      role: 'developer',
      content: `User Info: id=${input.user.id}, externalId=${input.user.externalId}, firstName=${input.user.firstName}, lastName=${input.user.lastName}.`,
    });

    const agentState = await this.agent.invoke(
      { messages: [userInfoMessage, ...input.messages] },
      { configurable: { thread_id: options?.threadId } },
    );

    return {
      messages: agentState.messages,
    };
  }

  buildChatMessage(input: BuildChatMessageInput): ChatMessage {
    return {
      role: input.role,
      content: input.content,
    };
  }

  private buildTools() {
    const saveMemoryTool = new DynamicStructuredTool({
      name: 'saveMemory',
      description: "Saves a user's memory. Expects a JSON input with 'userId' and 'content'.",
      schema: z.object({
        userId: z.string().describe('The unique identifier for the user.'),
        content: z.string().describe('The content of the memory to save.'),
      }),
      func: async ({ userId, content }: { userId: string; content: string }) => {
        try {
          const cleanContent = await this.textCleanerProvider.extractMemoryText(content);

          await this.memoryService.saveMemory({ userId, content: cleanContent });
          return 'Memory saved successfully!';
        } catch (error) {
          return `Error saving memory: ${error}`;
        }
      },
    });

    const retrieveMemoriesTool = new DynamicStructuredTool({
      name: 'retrieveMemories',
      description:
        'Retrieves relevant memories based on a query. ' +
        "Expects a JSON input with 'userId', 'content' (the query text), and 'k' (the number of memories to retrieve).",
      schema: z.object({
        userId: z.string().describe('The unique identifier for the user.'),
        content: z.string().describe('The query text to search for relevant memories.'),
        k: z.number().describe('The number of memories to retrieve.'),
      }),
      func: async ({ userId, content, k }: { userId: string; content: string; k: number }) => {
        try {
          const cleanContent = await this.textCleanerProvider.extractSearchQuery(content);

          const result = await this.memoryService.findRelevantMemories({ userId, content: cleanContent, k });

          return result;
        } catch (error) {
          return `Error retrieving memories: ${error}`;
        }
      },
    });

    const getParameterUserTool = new DynamicStructuredTool({
      name: 'getParameterServiceUser',
      description:
        'Retrieves a user from the parameter service. ' +
        'Use this tool only when you specifically need information from the parameter service, ' +
        'and not when you want information about your Telegram user profile. ' +
        "Expects a JSON input with 'userId'.",
      schema: z.object({
        userId: z.string().describe('The unique identifier for the user.'),
      }),
      func: async ({ userId }: { userId: string }) => {
        try {
          const user = await this.parameterProvider.getUserByExternalId(userId);
          // Format the response in a clear, concise way.
          return `User retrieved successfully:\nID: ${user.id}\nExternalID: ${user.externalId}\nFirstName: ${user.firstName}\nLastName: ${user.lastName}\nCreated At: ${user.createdAt}\nUpdated At: ${user.updatedAt}`;
        } catch (error) {
          console.log('error:', error);
          return `Error retrieving user: ${error}`;
        }
      },
    });

    const createParameterTool = new DynamicStructuredTool({
      name: 'createParameter',
      description:
        'Creates a new parameter in the parameter service. ' +
        'Use this tool when you want to register a new parameter. ' +
        "Expects a JSON input with 'userId', 'name', 'description', 'dataType', and 'unit'.",
      schema: z.object({
        userId: z.string().describe('The ID of the user for whom the parameter is created.'),
        name: z.string().describe('The name of the parameter.'),
        description: z.string().describe('A description for the parameter.'),
        dataType: z.enum(['float']).describe('The data type of the parameter (only "float" is supported).'),
        unit: z.string().describe('The unit of measurement for the parameter.'),
      }),
      func: async (input: { userId: string; name: string; description: string; dataType: 'float'; unit: string }) => {
        try {
          const parameterUser = await this.parameterProvider.getUserByExternalId(input.userId);

          const parameter = await this.parameterProvider.createParameter({
            userId: parameterUser.id,
            name: input.name,
            description: input.description,
            dataType: input.dataType,
            unit: input.unit,
          });

          return `Parameter created successfully:\nID: ${parameter.id}\nName: ${parameter.name}\nDataType: ${parameter.dataType}\nUnit: ${parameter.unit}`;
        } catch (error) {
          return `Error creating parameter: ${error}`;
        }
      },
    });

    const listMyParametersTool = new DynamicStructuredTool({
      name: 'listMyParameters',
      description:
        'Lists all parameters for the current user from the parameter service. ' +
        'This tool is restricted to the current user only.' +
        "Expects a JSON input with 'userId'.",
      schema: z.object({
        userId: z.string().describe('The unique identifier for the user.'),
      }),
      func: async ({ userId }: { userId: string }) => {
        try {
          const parameterUser = await this.parameterProvider.getUserByExternalId(userId);

          const parameters = await this.parameterProvider.listParametersByUser(parameterUser.id);

          if (parameters.length === 0) {
            return 'No parameters found for your account.';
          }

          const formattedList = parameters
            .map((param) => `ID: ${param.id}, Name: ${param.name}, DataType: ${param.dataType}, Unit: ${param.unit}`)
            .join('\n');

          return `Your parameters:\n${formattedList}`;
        } catch (error) {
          return `Error listing your parameters: ${error}`;
        }
      },
    });

    const createMeasurementTool = new DynamicStructuredTool({
      name: 'createMeasurement',
      description:
        'Creates a new measurement for a specified parameter. ' +
        'This tool should be used only to record a new measurement value for an existing parameter. ' +
        "Expects a JSON input with 'parameterId', 'notes' (optional), and 'value'.",
      schema: z.object({
        parameterId: z.string().describe('The ID of the parameter for which the measurement is recorded.'),
        notes: z.string().optional().describe('Any notes or details about the measurement.'),
        value: z.number().describe('The measurement value (a number).'),
      }),
      func: async (input: { parameterId: string; notes?: string; value: number }) => {
        try {
          const measurement = await this.parameterProvider.createMeasurement(input);

          return `Measurement created successfully:\nMeasurement ID: ${measurement.id}\nParameter ID: ${measurement.parameterId}\nValue: ${measurement.value}\nTimestamp: ${measurement.timestamp}`;
        } catch (error) {
          return `Error creating measurement: ${error}`;
        }
      },
    });

    const listMeasurementsByParameterTool = new DynamicStructuredTool({
      name: 'listMeasurementsByParameter',
      description:
        'Lists all measurements for a given parameter. ' +
        'This tool is used to retrieve all recorded measurement values for a specified parameter. ' +
        "Expects a JSON input with a 'parameterId' property.",
      schema: z.object({
        parameterId: z.string().describe('The ID of the parameter whose measurements should be listed.'),
      }),
      func: async ({ parameterId }: { parameterId: string }) => {
        try {
          const measurements = await this.parameterProvider.listMeasurementsByParameter(parameterId);

          if (measurements.length === 0) {
            return `No measurements found for parameter ${parameterId}.`;
          }

          // Format the list of measurements into a human-readable string.
          // You can customize this formatting as needed.
          const formattedList = measurements
            .map((m) => `Measurement ID: ${m.id}, Value: ${m.value}, Notes: ${m.notes}, Timestamp: ${m.timestamp}`)
            .join('\n');

          return `Measurements for parameter ${parameterId}:\n${formattedList}`;
        } catch (error) {
          console.error('Error in listMeasurementsByParameter tool:', error);
          return `Error listing measurements: ${error instanceof Error ? error.message : error}`;
        }
      },
    });

    return [
      saveMemoryTool,
      retrieveMemoriesTool,
      getParameterUserTool,
      createParameterTool,
      listMyParametersTool,
      createMeasurementTool,
      listMeasurementsByParameterTool,
    ];
  }
}

export default AgentProviderLangGraph;
