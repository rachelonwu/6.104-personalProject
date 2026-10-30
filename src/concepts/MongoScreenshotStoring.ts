
import type { Collection, Db } from "mongodb";
import { ScreenshotNotFound } from "./ScreenshotStoring.js";

type Screenshot = {
  screenshot: string;
  owner: string;
  imageRef: string;
  uploadedAt: string;
};

export class MongoScreenshotStoringConcept {
  private readonly screenshots: Collection<Screenshot>;

  constructor(
    database: Db,
    private readonly freshID: () => string = () => crypto.randomUUID(),
  ) {
    this.screenshots = database.collection<Screenshot>("screenshots");
  }

  async upload({
    owner,
    imageRef,
    uploadedAt,
  }: {
    owner: string;
    imageRef: string;
    uploadedAt: string;
  }) {
    const screenshot = this.freshID();

    await this.screenshots.insertOne({
      screenshot,
      owner,
      imageRef,
      uploadedAt,
    });

    return { screenshot };
  }

  async remove({ screenshot, owner }: { screenshot: string; owner: string }) {
    const result = await this.screenshots.deleteOne({ screenshot, owner });

    if (result.deletedCount === 0) {
      throw new ScreenshotNotFound("The screenshot does not exist.");
    }

    return {};
  }

  async _get({
    screenshot,
  }: {
    screenshot: string;
  }): Promise<Array<{
    owner: string;
    imageRef: string;
    uploadedAt: string;
  }>> {
    const found = await this.screenshots.findOne({ screenshot });

    if (found === null) {
      return [];
    }

    return [{
      owner: found.owner,
      imageRef: found.imageRef,
      uploadedAt: found.uploadedAt,
    }];
  }
}
