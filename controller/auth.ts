import { Request, Response } from "express"
import { Prisma, PrismaClient } from "@prisma/client"
import jwt, { JsonWebTokenError } from "jsonwebtoken"
import bcrypt from "bcrypt"
import { z } from "zod"

import { changePasswordSchema, passwordRecoverySchema, signinSchema, signupSchema } from "../schema/schema"
import { zParse } from "../utils/validation"
import { Boom } from "@hapi/boom"

const prisma = new PrismaClient()

export const signin = async (req: Request, res: Response) => {
  try {
    const { body } = await zParse(signinSchema, req)

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    })

    if (!user) {
      return res.status(401).json("Email not found")
    }

    if (!bcrypt.compareSync(body.password, user.password)) {
      return res.status(401).json("Incorrect Password")
    }

    const cartId = Number(req.cookies["cartId"])
    const cart = await prisma.cart.findUnique({ where: { userId: user.id } })

    if (!cart && cartId) {
      await prisma.cart.update({
        data: { userId: user.id },
        where: { id: cartId },
      })
      res.clearCookie("cartId")
    }

    const accessToken = jwt.sign({ userId: user.id, email: user.email, isLoggedIn: !!user.id }, "husky")

    res.cookie("access-token", accessToken, {
      sameSite: false,
      secure: process.env.NODE_ENV === "production",
      httpOnly: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 24h
    })

    req.session.userId = user.id
    req.session.userEmail = user.email

    return res.status(200).send({
      sessionId: req.sessionID,
      userId: user.id,
      isLoggedIn: !!user.id,
    })
  } catch (e) {
    if (e instanceof Boom) {
      return res.status(e.output.statusCode).json(e.data)
    }
    return res.status(500).json(e)
  }
}

export const logout = async (req: Request, res: Response) => {
  return await new Promise((resolve) => {
    req.session.destroy(() => {
      resolve(
        res.status(200).json({
          sessionId: null,
          userId: null,
          isLoggedIn: false,
        })
      )
    })
  })
}

export const recoverPassword = async (req: Request, res: Response) => {
  try {
    const { body } = await zParse(passwordRecoverySchema, req)

    const user = await prisma.user.findUnique({ where: { email: body.email } })

    if (!user) {
      return res.status(401).json("Email not found")
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, "super-secret", { expiresIn: 60 * 5 })

    await prisma.passwordRecoveryTokens.create({
      data: {
        userId: user.id,
        token: token,
        expiresAt: new Date(new Date().getTime() + 1000 * 60 * 5),
      },
    })

    res.status(200).json("Check your email for the recovery link")
  } catch (e) {
    if (e instanceof Boom) {
      return res.status(e.output.statusCode).json(e.data)
    }
    return res.status(500).json(e)
  }
}

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { body } = await zParse(changePasswordSchema, req)

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) return res.status(401).json("Email not found")

    const newPassword = bcrypt.hashSync(body.password, 10)

    if (body.flow === "password-recovery") {
      try {
        if (jwt.verify(body.recoveryToken, "super-secret")) {
          await prisma.user.update({ data: { password: newPassword }, where: { id: user.id } })
          await prisma.passwordRecoveryTokens.deleteMany({ where: { userId: user.id } })
          res.status(200).json("Password updated successfully")
        }
      } catch (e) {
        if (e instanceof JsonWebTokenError) {
          res.status(401).json("Invalid recovery token")
        }
      }
    } else {
      if (!req.session.userId) {
        return res.status(401).end()
      }

      await prisma.user.update({ data: { password: newPassword }, where: { id: user.id } })
      return res.status(200).json("Password updated successfully")
    }
  } catch (e) {
    if (e instanceof Boom) {
      return res.status(e.output.statusCode).json(e.data)
    }
    return res.status(500).json(e)
  }
}

export const signup = async (req: Request, res: Response) => {
  try {
    const { body } = await zParse(signupSchema, req)

    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        password: bcrypt.hashSync(body.password, 10),
        name: body.name,
      },
    })
    return res.status(201).json(newUser)
  } catch (e) {
    if (e instanceof Boom) {
      return res.status(e.output.statusCode).json(e.data)
    } else if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return res.status(409).json("Email already exists")
      }
    } else {
      return res.status(500).json(e)
    }
  }
}
