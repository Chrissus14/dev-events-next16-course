import mongoose, { Mongoose } from 'mongoose';

/**
 * Type for the cached global object we attach to `globalThis`.
 * This ensures we have strongly-typed access to the cached
 * connection and any pending connection promise during HMR.
 */
type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

/**
 * Augment the globalThis interface so TypeScript knows about
 * the `_mongoose` cache we attach in development. We use
 * `globalThis` instead of `global` for broader runtime support.
 */
declare global {
  var _mongoose: MongooseCache | undefined;
}

// Create or reference the cached holder on globalThis. This prevents
// multiple Mongoose connections when Next.js performs hot reloads in dev.
const cached: MongooseCache = globalThis._mongoose ?? { conn: null, promise: null };

/**
 * Connects to MongoDB using Mongoose and caches the connection.
 *
 * Usage:
 *   const db = await connectToDatabase();
 *   // use `db` (which is the mongoose instance) or import mongoose directly
 *
 * The function throws if `process.env.MONGODB_URI` is not defined.
 */
export async function connectToDatabase(): Promise<Mongoose> {
  // Use the connection string from environment variables.
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // If an existing connection is available, reuse it.
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection is currently being established, await it.
  if (!cached.promise) {
    // Configure mongoose to avoid deprecation warnings and enable recommended options.
    const options: mongoose.ConnectOptions = {
      // The following options are safe defaults; they are typed in ConnectOptions.
      // Use the unified topology layer (recommended).
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Disable buffering of commands when not connected to fail fast.
      bufferCommands: false,
    } as mongoose.ConnectOptions;

    // Start connecting and store the pending promise in the cache.
    cached.promise = mongoose.connect(uri, options).then((m) => {
      return m;
    });
  }

  // Await the connection promise and save the established connection.
  cached.conn = await cached.promise;

  // Store the cache on globalThis for future hot reloads.
  globalThis._mongoose = cached;

  return cached.conn!;
}

/**
 * A small helper to get the mongoose instance without creating a new connection.
 * This is useful in places where you may want to access models directly.
 */
export function getMongoose(): Mongoose | null {
  return cached.conn;
}

export default connectToDatabase;
