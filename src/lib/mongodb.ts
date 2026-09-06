import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
  throw new Error('MONGODB_URI is not set');
}
if (!dbName) {
  throw new Error('MONGODB_DB is not set');
}

// Cache the client across hot reloads (dev) and function invocations (serverless)
// so route handlers reuse one connection instead of opening a new one per request.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// A short server-selection timeout so an unreachable/misconfigured cluster
// fails fast (a few seconds) instead of hanging every page load for the
// driver's ~30s default — callers (e.g. src/lib/holdings.ts) already treat
// a rejected getDb() as "show an empty/unavailable state," not a crash.
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
const clientPromise: Promise<MongoClient> = global._mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== 'production') {
  global._mongoClientPromise = clientPromise;
}

export async function getDb(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}

export default clientPromise;
