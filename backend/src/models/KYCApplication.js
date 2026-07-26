import mongoose from "mongoose";

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_VALUES
} from "../config/kycReviewConstants.js";

const kycApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    dateOfBirth: {
      type: Date,
      required: true,
      max: Date.now
    },

    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"]
    },

    nationality: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    residentialAddress: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 250
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\+[1-9]\d{7,14}$/,
        "Phone number must use international format"
      ]
    },

    occupation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    applicationStatus: {
      type: String,
      enum:
        APPLICATION_STATUS_VALUES,
      default:
        APPLICATION_STATUSES.PENDING,
      index: true
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    reviewDate: {
      type: Date,
      default: null
    },

    reviewComments: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const KYCApplication = mongoose.model(
  "KYCApplication",
  kycApplicationSchema
);

export default KYCApplication;