/**
 * @file Minimal QueryCache prototype for QueryKey identity and collision research.
 * Research only: not a public package API or production implementation.
 */

import {
  type QueryKey,
  canonicalizeQueryKey,
  hashCanonicalKey,
  matchQueryKeyFamily,
} from "./query-key.js";

export interface QueryRecord<T> {
  readonly canonicalKey: string;
  readonly key: QueryKey;
  readonly data: T;
  readonly hash: number;
}

export type QueryKeyHasher = (canonicalKey: string) => number;

export class ResearchQueryCache<T = unknown> {
  private readonly buckets = new Map<number, QueryRecord<T>[]>();
  private readonly hasher: QueryKeyHasher;
  private entryCount = 0;

  constructor(hasher: QueryKeyHasher = hashCanonicalKey) {
    this.hasher = hasher;
  }

  get size(): number {
    return this.entryCount;
  }

  get bucketCount(): number {
    return this.buckets.size;
  }

  get collisionCount(): number {
    let collisions = 0;
    for (const bucket of this.buckets.values()) {
      if (bucket.length > 1) {
        collisions += bucket.length - 1;
      }
    }
    return collisions;
  }

  set(key: QueryKey, data: T): QueryRecord<T> {
    const canonicalKey = canonicalizeQueryKey(key);
    const hash = this.hasher(canonicalKey);
    return this.insertRecord({ canonicalKey, key, data, hash });
  }

  get(key: QueryKey): QueryRecord<T> | undefined {
    const canonicalKey = canonicalizeQueryKey(key);
    const hash = this.hasher(canonicalKey);
    return this.getByCanonicalAndHash(canonicalKey, hash);
  }

  has(key: QueryKey): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: QueryKey): boolean {
    const canonicalKey = canonicalizeQueryKey(key);
    const hash = this.hasher(canonicalKey);
    const bucket = this.buckets.get(hash);
    if (!bucket) {
      return false;
    }
    const index = bucket.findIndex((r) => r.canonicalKey === canonicalKey);
    if (index === -1) {
      return false;
    }
    bucket.splice(index, 1);
    this.entryCount -= 1;
    if (bucket.length === 0) {
      this.buckets.delete(hash);
    }
    return true;
  }

  clear(): void {
    this.buckets.clear();
    this.entryCount = 0;
  }

  values(): QueryRecord<T>[] {
    const all: QueryRecord<T>[] = [];
    for (const bucket of this.buckets.values()) {
      for (const record of bucket) {
        all.push(record);
      }
    }
    return all;
  }

  matchFamily(prefixKey: QueryKey): QueryRecord<T>[] {
    const matches: QueryRecord<T>[] = [];
    for (const bucket of this.buckets.values()) {
      for (const record of bucket) {
        if (matchQueryKeyFamily(prefixKey, record.key)) {
          matches.push(record);
        }
      }
    }
    return matches;
  }

  private insertRecord(record: QueryRecord<T>): QueryRecord<T> {
    let bucket = this.buckets.get(record.hash);
    if (!bucket) {
      bucket = [];
      this.buckets.set(record.hash, bucket);
    }

    const existingIndex = bucket.findIndex((r) => r.canonicalKey === record.canonicalKey);

    if (existingIndex >= 0) {
      bucket[existingIndex] = record;
    } else {
      bucket.push(record);
      this.entryCount += 1;
    }

    return record;
  }

  private getByCanonicalAndHash(canonicalKey: string, hash: number): QueryRecord<T> | undefined {
    const bucket = this.buckets.get(hash);
    if (!bucket) {
      return undefined;
    }
    return bucket.find((r) => r.canonicalKey === canonicalKey);
  }
}
