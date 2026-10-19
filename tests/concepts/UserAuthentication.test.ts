
import { describe, expect, test } from "bun:test";

import {
  UserAuthenticationConcept,
  EmailAlreadyRegistered,
  UserNotFound,
  SessionNotFound,
} from "../../src/concepts/UserAuthentication.js";

describe("UserAuthentication", () => {
  test("register creates a user that can be retrieved", () => {
    const auth = new UserAuthenticationConcept();

    const { user } = auth.register({
      email: "student@example.com",
      passwordHash: "hashed-password",
    });

    expect(auth._getUser({ user })).toEqual([
      {
        email: "student@example.com",
        passwordHash: "hashed-password",
      },
    ]);
  });

  test("register refuses duplicate email addresses", () => {
    const auth = new UserAuthenticationConcept();

    auth.register({
      email: "student@example.com",
      passwordHash: "first-hash",
    });

    expect(() =>
      auth.register({
        email: "student@example.com",
        passwordHash: "second-hash",
      })
    ).toThrow(EmailAlreadyRegistered);

    expect(auth._getByEmail({ email: "student@example.com" }))
      .toHaveLength(1);
  });

  test("_getByEmail finds an existing user", () => {
    const auth = new UserAuthenticationConcept();

    const { user } = auth.register({
      email: "student@example.com",
      passwordHash: "stored-hash",
    });

    expect(auth._getByEmail({ email: "student@example.com" }))
      .toEqual([
        {
          user,
          passwordHash: "stored-hash",
        },
      ]);
  });

  test("queries return no results for nonexistent users", () => {
    const auth = new UserAuthenticationConcept();

    expect(auth._getUser({ user: "missing-user" })).toEqual([]);

    expect(
      auth._getByEmail({ email: "missing@example.com" })
    ).toEqual([]);
  });

  test("login creates a session for an existing user", () => {
    const auth = new UserAuthenticationConcept();

    const { user } = auth.register({
      email: "student@example.com",
      passwordHash: "stored-hash",
    });

    const expiresAt = "2026-12-01T00:00:00.000Z";

    const { session } = auth.login({
      user,
      tokenHash: "hashed-session-token",
      expiresAt,
    });

    expect(typeof session).toBe("string");

    expect(
      auth._getSessionByTokenHash({
        tokenHash: "hashed-session-token",
      })
    ).toEqual([
      {
        session,
        user,
        expiresAt,
      },
    ]);
  });

  test("login refuses a nonexistent user without creating a session", () => {
    const auth = new UserAuthenticationConcept();

    expect(() =>
      auth.login({
        user: "missing-user",
        tokenHash: "invalid-session-token",
        expiresAt: "2026-12-01T00:00:00.000Z",
      })
    ).toThrow(UserNotFound);

    expect(
      auth._getSessionByTokenHash({
        tokenHash: "invalid-session-token",
      })
    ).toEqual([]);
  });

  test("logout invalidates an existing session", () => {
    const auth = new UserAuthenticationConcept();

    const { user } = auth.register({
      email: "student@example.com",
      passwordHash: "stored-hash",
    });

    const { session } = auth.login({
      user,
      tokenHash: "hashed-session-token",
      expiresAt: "2026-12-01T00:00:00.000Z",
    });

    expect(auth.logout({ session })).toEqual({});

    expect(
      auth._getSessionByTokenHash({
        tokenHash: "hashed-session-token",
      })
    ).toEqual([]);

    expect(auth._getUser({ user })).toHaveLength(1);
  });

  test("logout refuses a nonexistent session", () => {
    const auth = new UserAuthenticationConcept();

    expect(() =>
      auth.logout({ session: "missing-session" })
    ).toThrow(SessionNotFound);
  });

  test("logging out one session does not invalidate another", () => {
    const auth = new UserAuthenticationConcept();

    const { user } = auth.register({
      email: "student@example.com",
      passwordHash: "stored-hash",
    });

    const first = auth.login({
      user,
      tokenHash: "first-token-hash",
      expiresAt: "2026-12-01T00:00:00.000Z",
    });

    const second = auth.login({
      user,
      tokenHash: "second-token-hash",
      expiresAt: "2026-12-01T00:00:00.000Z",
    });

    auth.logout({ session: first.session });

    expect(
      auth._getSessionByTokenHash({
        tokenHash: "first-token-hash",
      })
    ).toEqual([]);

    expect(
      auth._getSessionByTokenHash({
        tokenHash: "second-token-hash",
      })
    ).toEqual([
      {
        session: second.session,
        user,
        expiresAt: "2026-12-01T00:00:00.000Z",
      },
    ]);
  });
});
