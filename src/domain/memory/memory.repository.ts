import { Memory } from './memory.model';

export interface MemoryRepository {
  saveMemory(memory: Memory): Promise<Memory>;
  findRelevantMemories(userId: string, queryEmbedding: number[], k: number): Promise<Memory[]>;
  deleteMemory(memoryId: string): Promise<void>;
}
