import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  subscription: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const PushSubscription = mongoose.models.PushSubscription || mongoose.model("PushSubscription", pushSubscriptionSchema);
