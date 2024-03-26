import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import Stripe from "stripe"

import { addItemToCartSchema } from "../schema/schema"
import { envServerSchema } from "../envSchema"

const prisma = new PrismaClient()
const stripe = new Stripe(envServerSchema.STRIPE_SK)

export const getCart = async (req: Request, res: Response) => {
  const cartId = Number(req.cookies["cartId"]) || undefined
  const userId = req.session.userId as number

  if (!cartId && !userId) {
    return res.status(200).json()
  }

  const isGuest = cartId && !userId

  try {
    if (isGuest) {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { cartItems: { include: { product: true } } },
      })

      if (!cart) {
        return res.status(200).end()
      }

      return res.status(200).send(cart)
    } else {
      const cart = await prisma.cart.findUnique({
        where: { userId: userId },
        include: { cartItems: { include: { product: true }, orderBy: { id: "asc" } } },
      })

      if (!cart) {
        return res.status(200).json()
      }

      return res.status(200).send(cart)
    }
  } catch (err) {
    console.log(err)
    return res.status(500).send("Internal Server Error")
  }
}

export const addItemToCart = async (req: Request, res: Response) => {
  const userId = req.session.userId as number
  const body = req.body as z.infer<typeof addItemToCartSchema>["body"]

  try {
    const product = await prisma.product.findUnique({ where: { id: body.productId } })

    if (!product) {
      throw "Product not found"
    }

    const isGuest = !userId
    const guestCartId = Number(req.cookies["cartId"]) || undefined

    const existingCart = await prisma.cart.findFirst({
      where: { OR: [{ userId }, { id: guestCartId }] },
    })

    if (existingCart) {
      const cart = await prisma.cart.update({
        data: {
          cartItems: {
            upsert: {
              create: {
                productId: body.productId,
                quantity: body.quantity,
              },
              update: {
                productId: body.productId,
                quantity: { increment: body.quantity },
              },
              where: {
                productId_cartId: {
                  cartId: existingCart.id,
                  productId: body.productId,
                },
              },
            },
          },
          totalPrice: { increment: product.price * body.quantity },
        },
        where: { id: existingCart.id },
        include: {
          cartItems: {
            include: { product: true },
            orderBy: { id: "asc" },
          },
        },
      })

      const item = cart.cartItems.find((cartItem) => cartItem.productId === body.productId)
      if (item?.quantity === 0) {
        const result = await prisma.cartItem.delete({
          where: { id: item.id },
          include: {
            cart: true,
            product: true,
          },
        })

        const cart = await prisma.cart.findUnique({
          where: { id: item.cartId },
          include: {
            cartItems: {
              include: { product: true },
            },
          },
        })

        return res.status(200).json(cart)
      }

      return res.status(200).json(cart)
    } else {
      const cart = await prisma.cart.create({
        data: {
          userId: userId,
          cartItems: {
            create: {
              productId: body.productId,
              quantity: body.quantity,
            },
          },
          totalPrice: product.price * body.quantity,
        },
        include: {
          cartItems: {
            include: { product: true },
          },
        },
      })

      if (isGuest) {
        res.cookie("cartId", cart.id, {
          sameSite: false,
          secure: process.env.NODE_ENV === "production",
          httpOnly: process.env.NODE_ENV === "production",
          maxAge: 1000 * 60 * 60 * 24, // 24h
        })
      }

      return res.status(200).send(cart)
    }
  } catch (err) {
    console.log(err)
    return res.status(500).send("Internal Server Error")
  }
}

export const checkoutCart = async (req: Request, res: Response) => {
  const userId = req.session.userId as number

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { cartItems: { include: { product: true } } },
    })

    if (!cart?.cartItems) {
      return res.status(400).json("Cart is empty")
    }

    const currentOrder = await prisma.order.findFirst({
      where: { userId, status: "PENDING" },
    })

    if (currentOrder) {
      const paymentIntent = await stripe.paymentIntents.update(currentOrder.paymentIntentId, {
        amount: cart.totalPrice,
      })

      await prisma.orderItem.deleteMany({ where: { orderId: currentOrder.id } })

      const order = await prisma.order.update({
        data: {
          orderItems: {
            createMany: {
              data: cart.cartItems.map((cartItem) => ({
                productId: cartItem.productId,
                quantity: cartItem.quantity,
                price: cartItem.product.price,
              })),
            },
          },
          totalPrice: cart.totalPrice,
        },
        where: { id: currentOrder.id },
      })

      return res.status(201).json({
        ...order,
        clientSecret: paymentIntent.client_secret,
      })
    } else {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: cart.totalPrice,
        currency: "usd",
      })

      const order = await prisma.order.create({
        data: {
          userId,
          orderItems: {
            createMany: {
              data: cart.cartItems.map((cartItem) => ({
                productId: cartItem.productId,
                quantity: cartItem.quantity,
                price: cartItem.product.price,
              })),
            },
          },
          status: "PENDING",
          totalPrice: cart.totalPrice,
          paymentIntentId: paymentIntent.id,
          paymentIntentClientSecret: paymentIntent.client_secret as string,
        },
        include: {
          orderItems: true,
        },
      })

      return res.status(201).json({
        ...order,
        clientSecret: paymentIntent.client_secret,
      })
    }
  } catch (e) {
    if (e instanceof Stripe.errors.StripeInvalidRequestError) {
      console.log("critical stripe error...")
    }

    console.log(e)
    return res.status(500).json("Internal Server Error")
  }
}
