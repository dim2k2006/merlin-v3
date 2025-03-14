export interface TextCleanerProvider {
  extractMemoryText(text: string): Promise<string>;
  extractSearchQuery(text: string): Promise<string>;
}
