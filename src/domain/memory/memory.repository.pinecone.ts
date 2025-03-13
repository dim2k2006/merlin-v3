import { Memory } from './memory.model';
import { MemoryRepository } from './memory.repository';
import { Pinecone, Index } from '@pinecone-database/pinecone';

type ConstructorInput = {
  apiKey: string;
  namespace: string;
  indexName: string;
};

class MemoryRepositoryPinecone implements MemoryRepository {
  private client: Pinecone;

  private index: Index<MetaData>;

  private namespace: string;

  constructor({ apiKey, namespace, indexName }: ConstructorInput) {
    this.client = new Pinecone({
      apiKey,
    });

    this.index = this.client.index<MetaData>(indexName);

    this.namespace = namespace;
  }

  async saveMemory(memory: Memory): Promise<Memory> {
    await this.index.namespace(this.namespace).upsert([
      {
        id: memory.id,
        values: memory.embeddingVector,
        metadata: this.buildMetaData(memory),
      },
    ]);

    return memory;
  }

  async findRelevantMemories(userId: string, queryEmbedding: number[], k: number): Promise<Memory[]> {
    const response = await this.index.namespace(this.namespace).query({
      topK: k,
      vector: queryEmbedding,
      includeValues: true,
      includeMetadata: true,
      filter: { userId: { $eq: userId } },
    });

    const result = response.matches.map((match) => {
      return {
        id: match.id,
        userId: match.metadata?.userId ?? '',
        content: match.metadata?.content ?? '',
        embeddingVector: match.values,
        metadata: match.metadata,
        createdAt: match.metadata?.createdAt ?? '',
      };
    });

    return result;
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await this.index.namespace(this.namespace).deleteOne(memoryId);
  }

  private buildMetaData(memory: Memory): MetaData {
    return {
      userId: memory.userId,
      content: memory.content,
      createdAt: memory.createdAt,
    };
  }
}

type MetaData = {
  userId: string;
  content: string;
  createdAt: string;
};

export default MemoryRepositoryPinecone;
