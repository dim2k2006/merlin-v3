export interface EmbeddingProvider {
  createEmbedding(input: CreateEmbeddingInput): Promise<Embedding>;
}

export type CreateEmbeddingInput = {
  input: string;
};

export type Embedding = {
  embedding: number[];
};
