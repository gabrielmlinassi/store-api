import express from "express"

import { requireAuth } from "../middleware/authenticator"
import * as AddressController from "../controller/address"

export const addressRouter = express.Router()

addressRouter.get("/shipping", requireAuth, AddressController.getShippingAddress)
addressRouter.post("/shipping", requireAuth, AddressController.createShippingAddress)
addressRouter.patch("/shipping", requireAuth, AddressController.editShippingAddress)
addressRouter.delete("/shipping", requireAuth, AddressController.deleteShippingAddress)
