import express from "express"

import * as CartController from "../controller/cart"
import { validate } from "../middleware/validator"
import { addItemToCartSchema } from "../schema/schema"
import { requireAuth } from "../middleware/authenticator"

export const cartRouter = express.Router()

cartRouter.get("/", CartController.getCart)
cartRouter.post("/", validate(addItemToCartSchema), CartController.addItemToCart)
cartRouter.post("/checkout", requireAuth, CartController.checkoutCart)
