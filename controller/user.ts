import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const getSession = async (req: Request, res: Response) => {
  const session = await prisma.session.findUnique({ where: { sid: req.session.id } })

  if (!session) {
    return res.status(200).json({})
  }

  return res.status(200).json({
    sessionId: req.session.id,
    userId: req.session.userId ?? null,
    isLoggedIn: !!req.session.userId,
  })
}

export const getAccount = async (req: Request, res: Response) => {
  const userId = req.session.userId

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return res.status(404).send("User not found")
    }

    return res.status(200).send({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    console.log(error)
    return res.status(400).send(error)
  }
}
