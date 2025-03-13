/**
 * Represents a piece of 'Memory' stored for a user.
 */
export type Memory = {
  id: string;
  userId: string;
  content: string;
  embeddingVector: number[];
  createdAt: string;
};
