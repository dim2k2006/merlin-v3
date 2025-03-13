import { Memory } from './memory.model';

export interface MemoryService {
  saveMemory(input: CreateMemoryInput): Promise<Memory>;
  findRelevantMemories(input: FindRelevantMemoriesInput): Promise<string>;
  deleteMemory(memoryId: string): Promise<void>;
}

export type CreateMemoryInput = {
  id?: string;
  userId: string;
  content: string;
};

export type FindRelevantMemoriesInput = {
  userId: string;
  content: string;
  k: number;
};
