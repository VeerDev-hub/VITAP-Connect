import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema({
  roomId: { type: String, index: true, required: true },
  callerId: { type: String, required: true },
  callerName: { type: String, required: true },
  calleeId: { type: String, required: true },
  calleeName: { type: String, default: "Student" },
  callType: { type: String, enum: ["voice", "video"], default: "video" },
  title: { type: String, default: "Private call" },
  status: { type: String, default: "ringing" },
  startedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  endedAt: { type: Date },
  durationSeconds: { type: Number, default: 0 }
});

export const CallLog = mongoose.models.CallLog || mongoose.model("CallLog", callLogSchema);
