
import type { Collection, Db } from "mongodb";
import { MongoServerError } from "mongodb";

import {
  EmailAlreadyRegistered,
  UserNotFound,
  SessionNotFound,
} from "./UserAuthentication.js";

type User = {
  user: string;
  email: string;
  passwordHash: string;
};

type Session = {
  session: string;
  user: string;
  tokenHash: string;
  expiresAt: string;
  expiresAtDate?: Date;
};

export class MongoUserAuthenticationConcept {
  private readonly users: Collection<User>;
  private readonly sessions: Collection<Session>;
  private readonly indexesReady: Promise<void>;

  constructor(
    database: Db,
    private readonly freshID: () => string = () => crypto.randomUUID()
  ) {
    this.users = database.collection<User>("users");
    this.sessions = database.collection<Session>("sessions");

    this.indexesReady = this.initializeIndexes();
  }

  private async initializeIndexes(): Promise<void> {
    await Promise.all([
      this.users.createIndex(
        { email: 1 },
        { unique: true }
      ),
      this.sessions.createIndex(
        { tokenHash: 1 },
        { unique: true }
      ),
      this.sessions.createIndex(
        { expiresAtDate: 1 },
        { expireAfterSeconds: 0 }
      ),
    ]);
  }

  async register({
    email,
    passwordHash,
  }: {
    email: string;
    passwordHash: string;
  }) {
    await this.indexesReady;

    const user = this.freshID();

    try {
      await this.users.insertOne({
        user,
        email,
        passwordHash,
      });
    } catch (error) {
      if (
        error instanceof MongoServerError &&
        error.code === 11000
      ) {
        throw new EmailAlreadyRegistered(
          "An account with this email already exists."
        );
      }

      throw error;
    }

    return { user };
  }

  async login({
    user,
    tokenHash,
    expiresAt,
  }: {
    user: string;
    tokenHash: string;
    expiresAt: string;
  }) {
    await this.indexesReady;

    const existingUser = await this.users.findOne({ user });

    if (existingUser === null) {
      throw new UserNotFound("The user does not exist.");
    }

    const expiresAtDate = new Date(expiresAt);

    if (
      !Number.isFinite(expiresAtDate.getTime()) ||
      expiresAtDate.getTime() <= Date.now()
    ) {
      throw new Error("Session expiration must be in the future.");
    }

    const session = this.freshID();

    await this.sessions.insertOne({
      session,
      user,
      tokenHash,
      expiresAt,
      expiresAtDate,
    });

    return { session };
  }

  async logout({ session }: { session: string }) {
    await this.indexesReady;

    const result = await this.sessions.deleteOne({ session });

    if (result.deletedCount === 0) {
      throw new SessionNotFound(
        "The session does not exist."
      );
    }

    return {};
  }

  async _getUser({ user }: { user: string }) {
    await this.indexesReady;

    const found = await this.users.findOne({ user });

    return found === null
      ? []
      : [{
          email: found.email,
          passwordHash: found.passwordHash,
        }];
  }

  async _getByEmail({ email }: { email: string }) {
    await this.indexesReady;

    const found = await this.users.findOne({ email });

    return found === null
      ? []
      : [{
          user: found.user,
          passwordHash: found.passwordHash,
        }];
  }

  async _getSessionByTokenHash({
    tokenHash,
  }: {
    tokenHash: string;
  }) {
    await this.indexesReady;

    const found = await this.sessions.findOne({ tokenHash });

    return found === null
      ? []
      : [{
          session: found.session,
          user: found.user,
          expiresAt: found.expiresAt,
        }];
  }
}
