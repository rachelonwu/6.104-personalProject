
import { describe, expect, test } from "bun:test";
import {
  IntentionInferringConcept,
  InferenceNotFound,
  InferenceAlreadyConfirmed,
} from "../../src/concepts/IntentionInferring.js";

describe("IntentionInferring", () => {
  test("infer creates a pending inference", () => {
    const concept = new IntentionInferringConcept(
      () => "inference-001",
    );

    const result = concept.infer({
      screenshot: "screenshot-001",
      description: "Attend career fair",
    });

    expect(result).toEqual({
      inference: "inference-001",
    });

    expect(concept._get({ inference: "inference-001" })).toEqual([
      {
        screenshot: "screenshot-001",
        description: "Attend career fair",
        status: "pending",
      },
    ]);
  });

  test("correct updates the description and status", () => {
    const concept = new IntentionInferringConcept(
      () => "inference-001",
    );

    const { inference } = concept.infer({
      screenshot: "screenshot-001",
      description: "Attend career fair",
    });

    concept.correct({
      inference,
      description: "Prepare for and attend career fair",
    });

    expect(concept._get({ inference })).toEqual([
      {
        screenshot: "screenshot-001",
        description: "Prepare for and attend career fair",
        status: "corrected",
      },
    ]);
  });

  test("confirm approves an inference without corrections", () => {
    const concept = new IntentionInferringConcept(
      () => "inference-001",
    );

    const { inference } = concept.infer({
      screenshot: "screenshot-001",
      description: "Attend career fair",
    });

    concept.confirm({ inference });

    expect(concept._get({ inference })[0]?.status).toBe(
      "confirmed",
    );
  });

  test("confirm approves a corrected inference", () => {
    const concept = new IntentionInferringConcept(
      () => "inference-001",
    );

    const { inference } = concept.infer({
      screenshot: "screenshot-001",
      description: "Attend career fair",
    });

    concept.correct({
      inference,
      description: "Prepare for and attend career fair",
    });

    concept.confirm({ inference });

    expect(concept._get({ inference })).toEqual([
      {
        screenshot: "screenshot-001",
        description: "Prepare for and attend career fair",
        status: "confirmed",
      },
    ]);
  });

  test("correct refuses a nonexistent inference", () => {
    const concept = new IntentionInferringConcept();

    expect(() =>
      concept.correct({
        inference: "missing-inference",
        description: "Attend career fair",
      }),
    ).toThrow(InferenceNotFound);
  });

  test("confirm refuses a nonexistent inference", () => {
    const concept = new IntentionInferringConcept();

    expect(() =>
      concept.confirm({
        inference: "missing-inference",
      }),
    ).toThrow(InferenceNotFound);
  });

  test("correct refuses an already confirmed inference", () => {
    const concept = new IntentionInferringConcept(
      () => "inference-001",
    );

    const { inference } = concept.infer({
      screenshot: "screenshot-001",
      description: "Attend career fair",
    });

    concept.confirm({ inference });

    expect(() =>
      concept.correct({
        inference,
        description: "Another description",
      }),
    ).toThrow(InferenceAlreadyConfirmed);
  });

  test("confirm refuses an already confirmed inference", () => {
    const concept = new IntentionInferringConcept(
      () => "inference-001",
    );

    const { inference } = concept.infer({
      screenshot: "screenshot-001",
      description: "Attend career fair",
    });

    concept.confirm({ inference });

    expect(() =>
      concept.confirm({ inference }),
    ).toThrow(InferenceAlreadyConfirmed);
  });

  test("_get returns an empty array for a nonexistent inference", () => {
    const concept = new IntentionInferringConcept();

    expect(
      concept._get({ inference: "missing-inference" }),
    ).toEqual([]);
  });
});
