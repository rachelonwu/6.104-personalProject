
export class EmailAlreadyRegistered extends Error {}
export class UserNotFound extends Error {}
export class SessionNotFound extends Error {}

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
};

export class UserAuthenticationConcept {
  private readonly users: User[] = [];
  private readonly sessions: Session[] = [];

  constructor(
    private readonly freshID: () => string = () => crypto.randomUUID()
  ) {}

  register({
    email,
    passwordHash,
  }: {
    email: string;
    passwordHash: string;
  }) {
    const existingUser = this.users.find(
      (user) => user.email === email
    );

    if (existingUser !== undefined) {
      throw new EmailAlreadyRegistered(
        "An account with this email already exists."
      );
    }

    const user = this.freshID();

    this.users.push({
      user,
      email,
      passwordHash,
    });

    return { user };
  }

  login({
    user,
    tokenHash,
    expiresAt,
  }: {
    user: string;
    tokenHash: string;
    expiresAt: string;
  }) {
    const existingUser = this.users.find(
      (account) => account.user === user
    );

    if (existingUser === undefined) {
      throw new UserNotFound("The user does not exist.");
    }

    const session = this.freshID();

    this.sessions.push({
      session,
      user,
      tokenHash,
      expiresAt,
    });

    return { session };
  }

  logout({ session }: { session: string }) {
    const index = this.sessions.findIndex(
      (existingSession) => existingSession.session === session
    );

    if (index === -1) {
      throw new SessionNotFound("The session does not exist.");
    }

    this.sessions.splice(index, 1);
    return {};
  }

  _getUser({ user }: { user: string }) {
    const found = this.users.find(
      (account) => account.user === user
    );

    return found === undefined
      ? []
      : [{
          email: found.email,
          passwordHash: found.passwordHash,
        }];
  }

  _getByEmail({ email }: { email: string }) {
    const found = this.users.find(
      (account) => account.email === email
    );

    return found === undefined
      ? []
      : [{
          user: found.user,
          passwordHash: found.passwordHash,
        }];
  }

  _getSessionByTokenHash({
    tokenHash,
  }: {
    tokenHash: string;
  }) {
    const found = this.sessions.find(
      (session) => session.tokenHash === tokenHash
    );

    return found === undefined
      ? []
      : [{
          session: found.session,
          user: found.user,
          expiresAt: found.expiresAt,
        }];
  }
}
