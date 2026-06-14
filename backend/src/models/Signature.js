import mongoose from "mongoose";

const signatureSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    signer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

const Signature = mongoose.model("Signature", signatureSchema);
export default Signature;
