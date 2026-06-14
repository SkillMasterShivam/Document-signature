import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    signerEmail: {
      type: String,
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "signed", "expired"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

const Invitation = mongoose.model("Invitation", invitationSchema);

export default Invitation;
