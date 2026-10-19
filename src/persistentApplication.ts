
import { assembleApplication } from "./assembly.js";
import { connectDatabase } from "./database.js";

import { MongoScreenshotStoringConcept } from "./concepts/MongoScreenshotStoring.js";
import { MongoIntentionInferringConcept } from "./concepts/MongoIntentionInferring.js";
import { MongoTaskTrackingConcept } from "./concepts/MongoTaskTracking.js";
import { MongoUserAuthenticationConcept } from "./concepts/MongoUserAuthentication.js";

export async function assemblePersistentApplication() {
  const database = await connectDatabase();

  const screenshots = new MongoScreenshotStoringConcept(database);
  const intentions = new MongoIntentionInferringConcept(database);
  const tasks = new MongoTaskTrackingConcept(database);
  const authentication = new MongoUserAuthenticationConcept(database);

  const application = assembleApplication({
    ScreenshotStoring: screenshots,
    IntentionInferring: intentions,
    TaskTracking: tasks,
    UserAuthentication: authentication,
  });

  return {
    application,
    screenshots,
    intentions,
    tasks,
    authentication,
  };
}

