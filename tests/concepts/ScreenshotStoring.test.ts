
import { describe, expect, test } from "bun:test";
import { ScreenshotStoringConcept } from "../../src/concepts/ScreenshotStoring.js";

describe("ScreenshotStoring", () => {
  test("upload creates a screenshot that can be retrieved", () => {
    const storing = new ScreenshotStoringConcept(() => "screenshot-001");

    const result = storing.upload({
      owner: "studentA",
      imageRef: "uploads/career-fair.png",
      uploadedAt: "2026-10-13T12:00:00Z",
    });

    expect(result).toEqual({ screenshot: "screenshot-001" });

    const screenshots = storing._get({
      screenshot: "screenshot-001",
    });

    expect(screenshots).toEqual([
      {
        owner: "studentA",
        imageRef: "uploads/career-fair.png",
        uploadedAt: "2026-10-13T12:00:00Z",
      },
    ]);
  });


test("remove deletes an existing screenshot", () => {
    const storing = new ScreenshotStoringConcept(() => "screenshot-001");

    storing.upload({
        owner: "studentA",
        imageRef: "uploads/career-fair.png",
        uploadedAt: "2026-10-13T12:00:00Z",
    });

    storing.remove({ screenshot: "screenshot-001" });

    expect(storing._get({ screenshot: "screenshot-001" })).toEqual([]);
    });

test("remove refuses when a screenshot does not exist", () => {
    const storing = new ScreenshotStoringConcept();

    expect(() =>
        storing.remove({ screenshot: "nonexistent" })
    ).toThrow("The screenshot does not exist.");
    });

test("get returns no results for a nonexistent screenshot", () => {
    const storing = new ScreenshotStoringConcept();

    expect(storing._get({ screenshot: "nonexistent" })).toEqual([]);
    });

});
