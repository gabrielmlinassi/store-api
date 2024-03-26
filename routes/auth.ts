import express from "express"

import * as AuthController from "../controller/auth"

export const authRouter = express.Router()

authRouter.post("/login", AuthController.signin)
authRouter.post("/signup", AuthController.signup)
authRouter.post("/logout", AuthController.logout)
authRouter.post("/change-password", AuthController.changePassword)
authRouter.post("/password-recovery", AuthController.recoverPassword)
