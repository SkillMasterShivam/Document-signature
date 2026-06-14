import mongoose from "mongoose";

const signatureSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    signer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    page: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Signed", "Rejected"],
      default: "Pending",
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    signedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound index for frequent queries
signatureSchema.index({ fileId: 1, signer: 1 });

const Signature = mongoose.model("Signature", signatureSchema);
export default Signature;
