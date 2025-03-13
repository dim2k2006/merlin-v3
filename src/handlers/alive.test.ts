import { describe, it, expect } from 'vitest';

// Sample function to test
function sum(a: number, b: number): number {
  return a + b;
}

describe('sum function', () => {
  it('should correctly add two positive numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });

  it('should correctly add negative numbers', () => {
    expect(sum(-1, -2)).toBe(-3);
  });

  it('should correctly add a positive and a negative number', () => {
    expect(sum(5, -2)).toBe(3);
  });
});
