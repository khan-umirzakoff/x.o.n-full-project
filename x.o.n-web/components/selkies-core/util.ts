// A generic Queue class to handle collections of any type.
export class Queue<T> {
  private items: T[];

  constructor(...elements: T[]) {
    this.items = [];
    this.enqueue(...elements);
  }

  enqueue(...elements: T[]): void {
    elements.forEach((element) => this.items.push(element));
  }

  dequeue(count = 1): T | undefined {
    return this.items.splice(0, count)[0];
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  toArray(): T[] {
    return [...this.items];
  }

  remove(element: T): void {
    const index = this.items.indexOf(element);
    if (index > -1) {
      this.items.splice(index, 1);
    }
  }

  find(element: T): boolean {
    return this.items.indexOf(element) !== -1;
  }

  clear(): void {
    this.items.length = 0;
  }
}

// Converts given string to base64 encoded string with UTF-8 format
export function stringToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const binString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte)
  ).join('');
  return btoa(binString);
}

// Converts given base64 UTF-8 format encoded string to its original form
export function base64ToString(base64: string): string {
  const stringBytes = atob(base64);
  const bytes = Uint8Array.from(stringBytes, (m) => m.codePointAt(0) as number);
  return new TextDecoder().decode(bytes);
}