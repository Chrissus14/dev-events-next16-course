import mongoose, { Document, Model, Schema, Types } from 'mongoose';

/**
 * Strongly-typed Booking document interface.
 */
export interface BookingDocument extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Simple email regex for basic validation. This is intentionally concise
 * and covers common email formats without external deps.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bookingSchema = new Schema<BookingDocument>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: [true, 'eventId is required'] },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => EMAIL_RE.test(v),
        message: 'Invalid email address',
      },
    },
  },
  { timestamps: true, strict: true }
);

// Index eventId for faster lookups of bookings per event.
bookingSchema.index({ eventId: 1 });

/**
 * Pre-save hook: ensure referenced event exists.
 * Uses the compiled Event model at runtime to avoid circular import issues.
 */
bookingSchema.pre<BookingDocument>('save', async function (next) {
  try {
    const Event = mongoose.model('Event');
    const exists = await Event.exists({ _id: this.eventId });
    if (!exists) throw new Error('Referenced Event does not exist');

    next();
  } catch (err) {
    next(err as Error);
  }
});

const Booking: Model<BookingDocument> = (mongoose.models.Booking as Model<BookingDocument>) || mongoose.model<BookingDocument>('Booking', bookingSchema);

export default Booking;
