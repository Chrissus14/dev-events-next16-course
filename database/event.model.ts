import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * Strongly-typed Event document interface.
 */
export interface EventDocument extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // ISO string
  time: string; // normalized HH:MM (24h)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper: slugify a string into a URL-friendly slug.
 */
function slugify(value: string): string {
  return value
    .toString()
    .toLowerCase()
    .trim()
    // replace spaces and invalid chars with -
    .replace(/[^a-z0-9]+/g, '-')
    // remove leading/trailing -
    .replace(/^-+|-+$/g, '')
    // collapse multiple -
    .replace(/-+/g, '-');
}

/**
 * Normalize time strings into HH:MM 24-hour format.
 * Accepts formats like "14:30", "2:30 pm", "2 PM", "02:30".
 */
function normalizeTime(input: string): string {
  const trimmed = input.trim().toLowerCase();

  // 24-hour format like 14:30 or 2:05
  const h24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    const hh = parseInt(h24[1], 10);
    const mm = parseInt(h24[2], 10);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) throw new Error('Invalid time');
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // 12-hour format with am/pm like "2:30 pm" or "2pm"
  const h12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (h12) {
    let hh = parseInt(h12[1], 10);
    const mm = h12[2] ? parseInt(h12[2], 10) : 0;
    const period = h12[3];
    if (hh < 1 || hh > 12 || mm < 0 || mm > 59) throw new Error('Invalid time');
    if (period === 'pm' && hh !== 12) hh += 12;
    if (period === 'am' && hh === 12) hh = 0;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  throw new Error('Unrecognized time format');
}

/**
 * Event schema definition with validation and timestamps.
 */
const eventSchema = new Schema<EventDocument>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      validate: {
        validator: (v: string) => v.trim().length > 0,
        message: 'Title cannot be empty',
      },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    overview: { type: String, required: [true, 'Overview is required'], trim: true },
    image: { type: String, required: [true, 'Image is required'], trim: true },
    venue: { type: String, required: [true, 'Venue is required'], trim: true },
    location: { type: String, required: [true, 'Location is required'], trim: true },
    date: { type: String, required: [true, 'Date is required'], trim: true },
    time: { type: String, required: [true, 'Time is required'], trim: true },
    mode: { type: String, required: [true, 'Mode is required'], trim: true },
    audience: { type: String, required: [true, 'Audience is required'], trim: true },
    agenda: {
      type: [String],
      required: [true, 'Agenda is required'],
      validate: {
        validator: (arr: string[]) => Array.isArray(arr) && arr.length > 0,
        message: 'Agenda must be a non-empty array of strings',
      },
    },
    organizer: { type: String, required: [true, 'Organizer is required'], trim: true },
    tags: {
      type: [String],
      required: [true, 'Tags are required'],
      validate: {
        validator: (arr: string[]) => Array.isArray(arr) && arr.length > 0,
        message: 'Tags must be a non-empty array of strings',
      },
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Ensure a unique index on slug for fast lookups and uniqueness enforcement.
eventSchema.index({ slug: 1 }, { unique: true });

/**
 * Pre-save hook to generate/refresh slug, normalize date and time.
 * Slug is only regenerated if the title changed.
 */
eventSchema.pre<EventDocument>('save', function (next) {
  try {
    // Generate slug if title changed or slug is not set
    if (this.isModified('title') || !this.slug) {
      this.slug = slugify(this.title);
    }

    // Normalize and validate date -> store as ISO string
    const dt = new Date(this.date);
    if (Number.isNaN(dt.getTime())) {
      throw new Error('Invalid date');
    }
    this.date = dt.toISOString();

    // Normalize time to HH:MM 24-hour format
    this.time = normalizeTime(this.time);

    next();
  } catch (err) {
    next(err as Error);
  }
});

/**
 * Export the Event model. Use existing compiled model when available
 * to avoid OverwriteModelError during hot reload in development.
 */
const Event: Model<EventDocument> = (mongoose.models.Event as Model<EventDocument>) || mongoose.model<EventDocument>('Event', eventSchema);

export default Event;
