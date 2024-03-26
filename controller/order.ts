import { PrismaClient } from "@prisma/client"
import { Request, Response } from "express"
import Stripe from "stripe"
import { z } from "zod"

import { zParse } from "../utils/validation"
import { CompleteOrderSchema, GetOrderShema } from "../schema/schema"
import { envServerSchema } from "../envSchema"

const prisma = new PrismaClient()
const stripe = new Stripe(envServerSchema.STRIPE_SK)

export const getOrder = async (req: Request, res: Response) => {
  const userId = req.session.userId
  const params = req.params as z.infer<typeof GetOrderShema>["params"]
  const orderId = Number(params.id) || undefined

  if (!orderId) {
    return res.status(400).json("Invalid order id")
  }

  try {
    const order = await prisma.order.findUnique({
      where: {
        userId,
        id: orderId,
      },
    })

    if (!order) {
      return res.status(404).json("Order not found")
    }

    return res.status(200).json(order)
  } catch (err) {
    console.log(err)
    return res.status(500).send("Internal Server Error")
  }
}

export const getCurrentOrder = async (req: Request, res: Response) => {
  const userId = req.session.userId

  try {
    const order = await prisma.order.findFirst({
      where: {
        userId,
        status: "PENDING",
      },
      include: { orderItems: { include: { product: true } } },
    })

    if (!order) {
      return res.status(404).json("Order not found")
    }

    return res.status(200).json(order)
  } catch (err) {
    console.log(err)
    return res.status(500).send("Internal Server Error")
  }
}

export const getOrders = async (req: Request, res: Response) => {
  const userId = req.session.userId

  try {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: { orderItems: { include: { product: true } } },
    })

    if (!orders.length) {
      return res.status(200).json([])
    }

    return res.status(200).json(orders)
  } catch (err) {
    console.log(err)
    return res.status(500).send("Internal Server Error")
  }
}

export const confirmOrder = async (req: Request, res: Response) => {
  const { userId } = req.session
  const { body, params } = await zParse(CompleteOrderSchema, req)
  const { id: orderId } = params

  try {
    const cart = await prisma.cart.findUnique({ where: { userId } })

    if (!cart) {
      res.status(404).json("Cart not found")
      return
    }

    const order = await prisma.order.findUnique({ where: { id: Number(orderId) } })

    if (!order) {
      res.status(404).json("Order not found")
      return
    }

    await stripe.paymentIntents.update(order.paymentIntentId, {
      amount: cart.totalPrice,
      currency: "usd",
      payment_method: body.paymentMethodId,
    })

    const intent = await stripe.paymentIntents.confirm(order.paymentIntentId, {
      return_url: `${req.headers.origin}/success`,
      use_stripe_sdk: true,
      mandate_data: {
        customer_acceptance: {
          type: "online",
          online: {
            ip_address: req.ip as string,
            user_agent: req.headers["user-agent"] as string,
          },
        },
      },
    })

    await prisma.cart.delete({ where: { id: cart.id } })

    res.status(200).json({
      paymentIntent: intent.id,
      paymentMethod: intent.payment_method,
      paymentStatus: intent.status,
    })
    return
  } catch (e) {
    console.log(e)
    return res.status(500).send(e)
  }
}
