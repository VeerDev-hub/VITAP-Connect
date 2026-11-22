import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
