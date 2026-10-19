# UserAuthentication

## Purpose

Allow users to create accounts and maintain authenticated sessions, preventing unauthorized access to personal SnapBack data and ensuring that each user's information can be associated with their own account.

## Principle

A user registers with an email address and password. After the password is securely hashed, the system stores the account. When the user signs in with valid credentials, the system creates a session associated with their account. The user can access their account while the session remains valid and can sign out to invalidate it.

## Types

```types
```

## State

```state
a set of Users with
  an email String
  a passwordHash String

a set of Sessions with
  a user User
  a tokenHash String
  an expiresAt String
```

## Actions

```actions
register(email: String, passwordHash: String) : returns (user: User)
  where no user in Users has the given email
  then
    add a new user with email and passwordHash
    returns user
  where a user in Users has the given email
  then
    refuses EMAIL_ALREADY_REGISTERED "An account with this email already exists."

login(user: User, tokenHash: String, expiresAt: String) : returns (session: Session)
  where user is in Users
  then
    add a new session with user, tokenHash, and expiresAt
    returns session
  where user is not in Users
  then
    refuses USER_NOT_FOUND "The user does not exist."

logout(session: Session) : returns ()
  where session is in Sessions
  then
    remove session from Sessions
    returns
  where session is not in Sessions
  then
    refuses SESSION_NOT_FOUND "The session does not exist."
```

## Queries

```queries
_getUser(user: User) : optional (email: String, passwordHash: String)
  Returns the account information when the user exists.

_getByEmail(email: String) : optional (user: User, passwordHash: String)
  Returns the account associated with the given email.

_getSessionByTokenHash(tokenHash: String) : optional (session: Session, user: User, expiresAt: String)
  Returns the session associated with the given token hash when it exists.
```
