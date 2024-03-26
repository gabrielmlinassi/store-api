import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { getProductsSchema } from "../schema/schema"

const prisma = new PrismaClient()

export const getProducts = async (req: Request, res: Response) => {
  const query = req.query as z.infer<typeof getProductsSchema>["query"]

  try {
    if (query?.search) {
      const result = await prisma.product.findMany({
        where: {
          name: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        orderBy: { name: "desc" },
        take: 4,
      })
      return res.json(result)
    } else {
      const result = await prisma.product.findMany()
      return res.json(result)
    }
  } catch (err) {
    console.log(err)
    return res.status(500).send("Internal Server Error")
  }
}
