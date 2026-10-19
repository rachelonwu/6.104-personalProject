
import { MongoClient, type Db } from "mongodb";

const connectionString =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";

const client = new MongoClient(connectionString);

let database: Db | undefined;

export async function connectDatabase(): Promise<Db> {
  if (database !== undefined) {
    return database;
  }

  await client.connect();
  database = client.db();

  console.log(`Connected to MongoDB database: ${database.databaseName}`);

  return database;
}

export async function closeDatabase(): Promise<void> {
  await client.close();
  database = undefined;
}
