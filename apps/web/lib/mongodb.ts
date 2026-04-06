import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/agri_crop_calendar";

const globalForMongo = globalThis as unknown as { _mongoClient: MongoClient };

let client: MongoClient;

if (process.env.NODE_ENV === "production") {
  client = new MongoClient(MONGODB_URI);
} else {
  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(MONGODB_URI);
  }
  client = globalForMongo._mongoClient;
}

export async function getDb(): Promise<Db> {
  await client.connect();
  return client.db();
}

export { client };
