import express from "express"

import { stripeCallback } from "../controller/stripe"

export const webhookRouter = express.Router()

webhookRouter.post("/", express.raw({ type: "application/json" }), stripeCallback)
