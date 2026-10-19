
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";

import { MongoClient, type Db } from "mongodb";

import {
  LoginRateLimiter,
} from "../../src/security/LoginRateLimiter.js";

describe("MongoDB login rate limiting", () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI must be set to run rate limiter tests."
    );
  }

  const client = new MongoClient(uri);

  const databaseName =
    `snapback_rate_limit_test_${crypto.randomUUID().replaceAll("-", "")}`;

  let database: Db;

  beforeAll(async () => {
    await client.connect();
    database = client.db(databaseName);
  });

  afterAll(async () => {
    try {
      if (database) {
        await database.dropDatabase();
      }
    } finally {
      await client.close();
    }
  });

  test("allows attempts up to the configured limit", async () => {
    const limiter = new LoginRateLimiter(
      database,
      15 * 60 * 1000,
      5
    );

    const key = "test:allowed";

    for (let i = 0; i < 5; i++) {
      const result = await limiter.consume(key);

      expect(result.allowed).toBe(true);
      expect(result.retryAfterSeconds).toBe(0);
    }

    const record = await database
      .collection("loginRateLimits")
      .findOne({ key });

    expect(record?.attempts).toBe(5);
  });

  test("rejects attempts exceeding the limit", async () => {
    const limiter = new LoginRateLimiter(
      database,
      15 * 60 * 1000,
      5
    );

    const key = "test:blocked";

    for (let i = 0; i < 5; i++) {
      expect((await limiter.consume(key)).allowed).toBe(true);
    }

    const blocked = await limiter.consume(key);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(
      15 * 60
    );
  });

  test("tracks different accounts independently", async () => {
    const limiter = new LoginRateLimiter(
      database,
      15 * 60 * 1000,
      3
    );

    const firstAccount = "test:account:a";
    const secondAccount = "test:account:b";

    for (let i = 0; i < 3; i++) {
      await limiter.consume(firstAccount);
    }

    expect(
      (await limiter.consume(firstAccount)).allowed
    ).toBe(false);

    expect(
      (await limiter.consume(secondAccount)).allowed
    ).toBe(true);
  });

  test("preserves limits across limiter reassembly", async () => {
    const key = "test:persistence";

    const firstLimiter = new LoginRateLimiter(
      database,
      15 * 60 * 1000,
      2
    );

    expect(
      (await firstLimiter.consume(key)).allowed
    ).toBe(true);

    expect(
      (await firstLimiter.consume(key)).allowed
    ).toBe(true);

    const restartedLimiter = new LoginRateLimiter(
      database,
      15 * 60 * 1000,
      2
    );

    expect(
      (await restartedLimiter.consume(key)).allowed
    ).toBe(false);
  });

  test("counts concurrent attempts atomically", async () => {
    const limiter = new LoginRateLimiter(
      database,
      15 * 60 * 1000,
      5
    );

    const key = "test:concurrent";

    const results = await Promise.all(
      Array.from(
        { length: 20 },
        () => limiter.consume(key)
      )
    );

    const allowed = results.filter(
      (result) => result.allowed
    );

    const blocked = results.filter(
      (result) => !result.allowed
    );

    expect(allowed).toHaveLength(5);
    expect(blocked).toHaveLength(15);

    const record = await database
      .collection("loginRateLimits")
      .findOne({ key });

    expect(record?.attempts).toBe(20);
  });

  test("stores expiration dates for automatic cleanup", async () => {
    const limiter = new LoginRateLimiter(
      database,
      15 * 60 * 1000,
      5
    );

    const key = "test:expiration";

    await limiter.consume(key);

    const record = await database
      .collection("loginRateLimits")
      .findOne({ key });

    expect(record).not.toBeNull();
    expect(record?.expiresAt).toBeInstanceOf(Date);
    expect(record?.windowStartedAt).toBeInstanceOf(Date);

    const indexes = await database
      .collection("loginRateLimits")
      .indexes();

    const ttlIndex = indexes.find(
      (index) => index.key?.expiresAt === 1
    );

    expect(ttlIndex?.expireAfterSeconds).toBe(0);
  });

  test("rejects excessive signup attempts", async () => {
    const signupLimiter = new LoginRateLimiter(
      database,
      15 * 60 * 1000,
      5
    );

    const key = "signup:account:test";

    for (let i = 0; i < 5; i++) {
      expect(
        (await signupLimiter.consume(key)).allowed
      ).toBe(true);
    }

    expect(
      (await signupLimiter.consume(key)).allowed
    ).toBe(false);
  });
});
