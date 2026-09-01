import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

const isProduction = url.startsWith("https://") && token.length > 0;

if (!isProduction) {
  console.warn(
    "[Redis] Local mode — rate limiting and token tracking are pass-through. " +
      "Set UPSTASH_REDIS_REST_URL to an https:// Upstash URL for production."
  );
}

class LocalPipeline {
  private calls: string[] = [];

  incr(): this {
    this.calls.push("incr");
    return this;
  }
  incrby(): this {
    this.calls.push("incrby");
    return this;
  }
  expire(): this {
    this.calls.push("expire");
    return this;
  }
  zadd(): this {
    this.calls.push("zadd");
    return this;
  }
  zrange(): this {
    this.calls.push("zrange");
    return this;
  }
  zrangeByScore(): this {
    this.calls.push("zrangebyscore");
    return this;
  }
  zremrangeByRank(): this {
    this.calls.push("zremrangebyrank");
    return this;
  }
  zcard(): this {
    this.calls.push("zcard");
    return this;
  }
  eval(): this {
    this.calls.push("eval");
    return this;
  }

  async exec(): Promise<unknown[]> {
    return this.calls.map(() => null);
  }
}

class LocalRedisMock {
  pipeline(): LocalPipeline {
    return new LocalPipeline();
  }

  async get(): Promise<null> {
    return null;
  }

  async set(): Promise<"OK"> {
    return "OK";
  }

  async del(): Promise<number> {
    return 1;
  }

  async incr(): Promise<number> {
    return 1;
  }

  async expire(): Promise<boolean> {
    return true;
  }

  async eval(): Promise<unknown> {
    return null;
  }

  async zadd(): Promise<number> {
    return 1;
  }

  async zrange(): Promise<string[]> {
    return [];
  }

  async zrangeByScore(): Promise<string[]> {
    return [];
  }

  async zremrangeByRank(): Promise<number> {
    return 1;
  }

  async zcard(): Promise<number> {
    return 0;
  }

  async publish(): Promise<number> {
    return 1;
  }

  async zscore(): Promise<null> {
    return null;
  }

  async zrevrank(): Promise<null> {
    return null;
  }

  async zrem(): Promise<number> {
    return 0;
  }

  async subscribe(): Promise<string> {
    return "OK";
  }
}

export const redis = isProduction
  ? new Redis({ url, token, enableAutoPipelining: true })
  : (new LocalRedisMock() as unknown as Redis);
