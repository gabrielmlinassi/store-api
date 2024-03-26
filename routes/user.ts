import express from "express"

import * as userController from "../controller/user"
import * as otherController from "../controller/other"
import { validate } from "../middleware/validator"
import { requireAuth } from "../middleware/authenticator"
import { getProductsSchema } from "../schema/schema"

export const userRouter = express.Router()

userRouter.get("/session", userController.getSession)
userRouter.get("/account", requireAuth, userController.getAccount)

userRouter.get("/products", validate(getProductsSchema), otherController.getProducts)
