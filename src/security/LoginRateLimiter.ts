
import type { Collection, Db } from "mongodb";
import { MongoServerError } from "mongodb";

type RateLimitRecord = {
  key: string;
  attempts: number;
  windowStartedAt: Date;
  expiresAt: Date;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export class LoginRateLimiter {
  private readonly collection: Collection<RateLimitRecord>;
  private readonly indexesReady: Promise<void>;

  constructor(
    database: Db,
    private readonly windowMs = 15 * 60 * 1000,
    private readonly maxAttempts = 5
  ) {
    this.collection = database.collection<RateLimitRecord>(
      "loginRateLimits"
    );

    this.indexesReady = Promise.all([
      this.collection.createIndex({ key: 1 }, { unique: true }),
      this.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      ),
    ]).then(() => undefined);
  }

  async consume(key: string): Promise<RateLimitResult> {
    await this.indexesReady;

    for (let attempt = 0; attempt < 3; attempt++) {
      const now = new Date();
      const cutoff = new Date(now.getTime() - this.windowMs);

      try {
        const record = await this.collection.findOneAndUpdate(
          { key },
          [
            {
              $set: {
                key,
                attempts: {
                  $cond: [
                    {
                      $or: [
                        { $eq: [{ $type: "$windowStartedAt" }, "missing"] },
                        { $lte: ["$windowStartedAt", cutoff] },
                      ],
                    },
                    1,
                    { $add: ["$attempts", 1] },
                  ],
                },
                windowStartedAt: {
                  $cond: [
                    {
                      $or: [
                        { $eq: [{ $type: "$windowStartedAt" }, "missing"] },
                        { $lte: ["$windowStartedAt", cutoff] },
                      ],
                    },
                    now,
                    "$windowStartedAt",
                  ],
                },
                expiresAt: new Date(now.getTime() + this.windowMs),
              },
            },
          ],
          { upsert: true, returnDocument: "after" }
        );

        if (!record) {
          throw new Error("Rate limiter did not return a record.");
        }

        const allowed = record.attempts <= this.maxAttempts;

        return {
          allowed,
          retryAfterSeconds: allowed
            ? 0
            : Math.max(
                1,
                Math.ceil(
                  (
                    record.windowStartedAt.getTime() +
                    this.windowMs -
                    Date.now()
                  ) / 1000
                )
              ),
        };
      } catch (error) {
        if (
          error instanceof MongoServerError &&
          error.code === 11000 &&
          attempt < 2
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new Error("Could not update login rate limit.");
  }
}
