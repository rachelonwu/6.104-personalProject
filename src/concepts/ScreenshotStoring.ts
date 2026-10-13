
export class ScreenshotNotFound extends Error {}

type Screenshot = {
  screenshot: string;
  owner: string;
  imageRef: string;
  uploadedAt: string;
};

export class ScreenshotStoringConcept {
  private readonly screenshots: Screenshot[] = [];

  constructor(
    private readonly freshID: () => string = () => crypto.randomUUID()
  ) {}

  upload({
    owner,
    imageRef,
    uploadedAt,
  }: {
    owner: string;
    imageRef: string;
    uploadedAt: string;
  }) {
    const screenshot = this.freshID();

    this.screenshots.push({
      screenshot,
      owner,
      imageRef,
      uploadedAt,
    });

    return { screenshot };
  }

    remove({ screenshot }: { screenshot: string }) {
        const index = this.screenshots.findIndex(
            (s) => s.screenshot === screenshot
        );

        if (index === -1) {
            throw new ScreenshotNotFound("The screenshot does not exist.");
        }

        this.screenshots.splice(index, 1);
        return {};
    }

    _get({
    screenshot,
    }: {
    screenshot: string;
    }): Array<{ owner: string; imageRef: string; uploadedAt: string }> {
        const found = this.screenshots.find(
            (s) => s.screenshot === screenshot
        );

        return found === undefined
            ? []
            : [{
                owner: found.owner,
                imageRef: found.imageRef,
                uploadedAt: found.uploadedAt,
            }];
    }


}
