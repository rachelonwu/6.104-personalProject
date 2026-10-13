
import type { Collection, Db } from "mongodb";
import {
  InferenceNotFound,
  InferenceAlreadyConfirmed,
} from "./IntentionInferring.js";

type InferenceStatus = "pending" | "corrected" | "confirmed";

type Inference = {
  inference: string;
  screenshot: string;
  description: string;
  status: InferenceStatus;
};

export class MongoIntentionInferringConcept {
  private readonly inferences: Collection<Inference>;

  constructor(
    database: Db,
    private readonly freshID: () => string = () => crypto.randomUUID(),
  ) {
    this.inferences = database.collection<Inference>("inferences");
  }

  async infer({
    screenshot,
    description,
  }: {
    screenshot: string;
    description: string;
  }) {
    const inference = this.freshID();

    await this.inferences.insertOne({
      inference,
      screenshot,
      description,
      status: "pending",
    });

    return { inference };
  }

  async correct({
    inference,
    description,
  }: {
    inference: string;
    description: string;
  }) {
    const result = await this.inferences.updateOne(
      { inference, status: { $ne: "confirmed" } },
      { $set: { description, status: "corrected" } },
    );

    if (result.matchedCount === 0) {
      const existing = await this.inferences.findOne({ inference });

      if (existing === null) {
        throw new InferenceNotFound("The inference does not exist.");
      }

      throw new InferenceAlreadyConfirmed(
        "The inference has already been confirmed.",
      );
    }

    return {};
  }

  async confirm({ inference }: { inference: string }) {
    const found = await this.inferences.findOneAndUpdate(
      { inference, status: { $ne: "confirmed" } },
      { $set: { status: "confirmed" } },
      { returnDocument: "before" },
    );

    if (found === null) {
      const existing = await this.inferences.findOne({ inference });

      if (existing === null) {
        throw new InferenceNotFound("The inference does not exist.");
      }

      throw new InferenceAlreadyConfirmed(
        "The inference has already been confirmed.",
      );
    }

    return {
      screenshot: found.screenshot,
      description: found.description,
    };
  }

  async _get({
    inference,
  }: {
    inference: string;
  }): Promise<Array<{
    screenshot: string;
    description: string;
    status: InferenceStatus;
  }>> {
    const found = await this.inferences.findOne({ inference });

    if (found === null) {
      return [];
    }

    return [{
      screenshot: found.screenshot,
      description: found.description,
      status: found.status,
    }];
  }
}
