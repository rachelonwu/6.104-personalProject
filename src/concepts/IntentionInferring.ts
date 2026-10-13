
export class InferenceNotFound extends Error {}
export class InferenceAlreadyConfirmed extends Error {}

type InferenceStatus = "pending" | "corrected" | "confirmed";

type Inference = {
  inference: string;
  screenshot: string;
  description: string;
  status: InferenceStatus;
};

export class IntentionInferringConcept {
  private readonly inferences: Inference[] = [];

  constructor(
    private readonly freshID: () => string = () => crypto.randomUUID(),
  ) {}

  infer({
    screenshot,
    description,
  }: {
    screenshot: string;
    description: string;
  }) {
    const inference = this.freshID();

    this.inferences.push({
      inference,
      screenshot,
      description,
      status: "pending",
    });

    return { inference };
  }

  correct({
    inference,
    description,
  }: {
    inference: string;
    description: string;
  }) {
    const found = this.inferences.find(
      (item) => item.inference === inference,
    );

    if (found === undefined) {
      throw new InferenceNotFound("The inference does not exist.");
    }

    if (found.status === "confirmed") {
      throw new InferenceAlreadyConfirmed(
        "The inference has already been confirmed.",
      );
    }

    found.description = description;
    found.status = "corrected";

    return {};
  }

  confirm({ inference }: { inference: string }) {
    const found = this.inferences.find(
      (item) => item.inference === inference,
    );

    if (found === undefined) {
      throw new InferenceNotFound("The inference does not exist.");
    }

    if (found.status === "confirmed") {
      throw new InferenceAlreadyConfirmed(
        "The inference has already been confirmed.",
      );
    }

    found.status = "confirmed";

    return {
      screenshot: found.screenshot,
      description: found.description,
    };
  }

  _get({
    inference,
  }: {
    inference: string;
  }): Array<{
    screenshot: string;
    description: string;
    status: InferenceStatus;
  }> {
    const found = this.inferences.find(
      (item) => item.inference === inference,
    );

    if (found === undefined) {
      return [];
    }

    return [{
      screenshot: found.screenshot,
      description: found.description,
      status: found.status,
    }];
  }
}
