import express, { Router } from "express"

import { webhookRouter } from "./webhook"
import { orderRouter } from "./order"
import { cartRouter } from "./cart"
import { userRouter } from "./user"
import { authRouter } from "./auth"
import { addressRouter } from "./address"

export const router = Router()

router.use("/", userRouter)

router.use("/address", express.json(), addressRouter)
router.use("/auth", express.json(), authRouter)
router.use("/cart", express.json(), cartRouter)
router.use("/orders", express.json(), orderRouter)
router.use("/webhook", express.raw({ type: "application/json" }), webhookRouter)
