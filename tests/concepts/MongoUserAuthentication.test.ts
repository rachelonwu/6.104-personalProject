
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";

import { MongoClient, type Db } from "mongodb";

import {
  MongoUserAuthenticationConcept,
} from "../../src/concepts/MongoUserAuthentication.js";

import {
  EmailAlreadyRegistered,
  UserNotFound,
  SessionNotFound,
} from "../../src/concepts/UserAuthentication.js";

describe("MongoUserAuthentication", () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI must be set to run MongoDB tests.");
  }

  const client = new MongoClient(uri);
  const databaseName = `snapback_auth_test_${crypto.randomUUID().replaceAll("-", "")}`;

  let database: Db;
  let auth: MongoUserAuthenticationConcept;

  beforeAll(async () => {
    await client.connect();
    database = client.db(databaseName);
    auth = new MongoUserAuthenticationConcept(database);
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

  test("registration persists across concept reassembly", async () => {
    const email = "persistent@example.com";

    const { user } = await auth.register({
      email,
      passwordHash: "stored-password-hash",
    });

    const reassembled = new MongoUserAuthenticationConcept(database);

    expect(await reassembled._getUser({ user })).toEqual([
      {
        email,
        passwordHash: "stored-password-hash",
      },
    ]);
  });

  test("duplicate registration is refused without modifying the account", async () => {
    const email = "duplicate@example.com";

    const { user } = await auth.register({
      email,
      passwordHash: "original-hash",
    });

    await expect(
      auth.register({
        email,
        passwordHash: "replacement-hash",
      })
    ).rejects.toBeInstanceOf(EmailAlreadyRegistered);

    expect(await auth._getByEmail({ email })).toEqual([
      {
        user,
        passwordHash: "original-hash",
      },
    ]);

    expect(
      await database.collection("users").countDocuments({ email })
    ).toBe(1);
  });

  test("concurrent duplicate registrations create only one account", async () => {
    const email = "concurrent@example.com";

    const results = await Promise.allSettled([
      auth.register({ email, passwordHash: "hash-a" }),
      auth.register({ email, passwordHash: "hash-b" }),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);

    expect(
      results.filter(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof EmailAlreadyRegistered
      )
    ).toHaveLength(1);

    expect(
      await database.collection("users").countDocuments({ email })
    ).toBe(1);
  });

  test("login creates a session that persists across reassembly", async () => {
    const { user } = await auth.register({
      email: "session@example.com",
      passwordHash: "stored-hash",
    });

    const expiresAt = "2027-01-01T00:00:00.000Z";

    const { session } = await auth.login({
      user,
      tokenHash: "persistent-session-token-hash",
      expiresAt,
    });

    const reassembled = new MongoUserAuthenticationConcept(database);

    expect(
      await reassembled._getSessionByTokenHash({
        tokenHash: "persistent-session-token-hash",
      })
    ).toEqual([
      { session, user, expiresAt },
    ]);
  });

  test("login refuses a nonexistent user without creating a session", async () => {
    await expect(
      auth.login({
        user: "missing-user",
        tokenHash: "missing-user-token",
        expiresAt: "2027-01-01T00:00:00.000Z",
      })
    ).rejects.toBeInstanceOf(UserNotFound);

    expect(
      await auth._getSessionByTokenHash({
        tokenHash: "missing-user-token",
      })
    ).toEqual([]);
  });

  test("logout removes the session but preserves the account", async () => {
    const { user } = await auth.register({
      email: "logout@example.com",
      passwordHash: "stored-hash",
    });

    const { session } = await auth.login({
      user,
      tokenHash: "logout-session-token",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    expect(await auth.logout({ session })).toEqual({});

    const reassembled = new MongoUserAuthenticationConcept(database);

    expect(
      await reassembled._getSessionByTokenHash({
        tokenHash: "logout-session-token",
      })
    ).toEqual([]);

    expect(await reassembled._getUser({ user })).toHaveLength(1);
  });

  test("logout refuses a nonexistent session without changing other sessions", async () => {
    const { user } = await auth.register({
      email: "active@example.com",
      passwordHash: "stored-hash",
    });

    const expiresAt = "2027-01-01T00:00:00.000Z";

    const { session } = await auth.login({
      user,
      tokenHash: "active-session-token",
      expiresAt,
    });

    await expect(
      auth.logout({ session: "missing-session" })
    ).rejects.toBeInstanceOf(SessionNotFound);

    expect(
      await auth._getSessionByTokenHash({
        tokenHash: "active-session-token",
      })
    ).toEqual([
      { session, user, expiresAt },
    ]);
  });
});
