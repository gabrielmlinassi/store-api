import express from "express"

import * as OrderController from "../controller/order"
import { validate } from "../middleware/validator"
import { GetOrderShema } from "../schema/schema"
import { requireAuth } from "../middleware/authenticator"

export const orderRouter = express.Router()

orderRouter.get("/current", requireAuth, OrderController.getCurrentOrder)
orderRouter.post("/:id/confirm", requireAuth, OrderController.confirmOrder)
orderRouter.get("/orders", requireAuth, OrderController.getOrders)
orderRouter.get("/:id", requireAuth, validate(GetOrderShema), OrderController.getOrder)
orderRouter.get("/", requireAuth, OrderController.getOrders)
