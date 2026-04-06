import { MongoClient } from "mongodb";

const uri = "mongodb+srv://adsinc:adsinc@cluster0.kaofmaq.mongodb.net/agri_crop_calendar?retryWrites=true&w=majority";

async function test() {
  console.log("Connecting to Atlas...");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    console.log("Connected successfully!");
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log("Existing collections:", collections.map(c => c.name));
    await client.close();
  } catch (e: any) {
    console.error("Connection failed:", e.message);
  }
}

test();
