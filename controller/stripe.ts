import { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import Stripe from "stripe"

import { envServerSchema } from "../envSchema"

const prisma = new PrismaClient()
const stripe = new Stripe(envServerSchema.STRIPE_SK)

const endpointSecret = "whsec_53395c63bb26c2b280c50b51d729606641bf55f8ac3e61372561010447912d31"

export const stripeCallback = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"]

  let event = null

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret)
  } catch (err) {
    console.log(err)
    res.status(400).end()
    return
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      const intent = event.data.object

      console.log("LOG", intent)

      try {
        await prisma.order.update({
          data: { status: "COMPLETED" },
          where: { paymentIntentId: intent.id },
        })

        res.status(200).end()
        return
      } catch (err) {
        console.log(err)
        res.status(500).end()
        return
      }
    default:
      console.log(`Unhandled event type ${event.type}`)
      break
  }

  return res.status(200).end()
}
