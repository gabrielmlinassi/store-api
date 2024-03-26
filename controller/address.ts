import { Request, Response } from "express"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"

import { deleteShippingAddressSchema, editShippingAddressSchema, shippingAddressSchema } from "../schema/schema"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { zParse } from "../utils/validation"
import { Boom } from "@hapi/boom"

const prisma = new PrismaClient()

export const getShippingAddress = async (req: Request, res: Response) => {
  const userId = req.session.userId as number

  try {
    const shipmentAddresses = await prisma.shipmentAddress.findMany({ where: { userId } })
    const userDefaults = await prisma.userDefault.findUnique({ where: { userId } })

    const result = shipmentAddresses.map((shipmentAddress) => ({
      ...shipmentAddress,
      isDefault: userDefaults?.defaultShippingAddressId === shipmentAddress.id,
    }))

    return res.status(200).json(result)
  } catch (e) {
    if (e instanceof Boom) {
      return res.status(e.output.statusCode).json(e.data)
    }
    return res.status(500).json(e)
  }
}

export const createShippingAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number
    const { body } = await zParse(shippingAddressSchema, req)

    const shipmentAddress = await prisma.shipmentAddress.create({
      data: {
        name: body.name,
        userId: userId,
        address: body.address,
        number: body.number,
        zip: body.zip,
        complement: body.complement,
      },
    })

    if (body.isDefault) {
      await prisma.userDefault.upsert({
        create: { userId, defaultShippingAddressId: shipmentAddress.id },
        update: { defaultShippingAddressId: shipmentAddress.id },
        where: { userId },
      })
      return res.status(201).json({ ...shipmentAddress, isDefault: true })
    }

    return res.status(201).json(shipmentAddress)
  } catch (e) {
    console.log(e)
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return res.status(409).json("Shipping address name already exists")
      }
    } else if (e instanceof Boom) {
      return res.status(e.output.statusCode).json(e.data)
    } else {
      return res.status(500).json(e)
    }
  }
}

export const editShippingAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number
    const { body } = await zParse(editShippingAddressSchema, req)

    if (body.isDefault) {
      await prisma.userDefault.upsert({
        create: { userId, defaultShippingAddressId: body.id },
        update: { defaultShippingAddressId: body.id },
        where: { userId },
      })
    }

    const shipmentAddress = await prisma.shipmentAddress.update({
      data: {
        address: body.address,
        zip: body.zip,
        number: body.number,
        complement: body.complement,
      },
      where: {
        id: body.id,
        userId,
      },
    })

    const userDefaults = await prisma.userDefault.findUnique({ where: { userId } })

    return res.status(201).json({
      ...shipmentAddress,
      isDefault: userDefaults?.defaultShippingAddressId === shipmentAddress.id,
    })
  } catch (e) {
    if (e instanceof Boom) {
      return res.status(e.output.statusCode).json(e.data)
    }
    return res.status(500).json(e)
  }
}

export const deleteShippingAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number
    const { body } = await zParse(deleteShippingAddressSchema, req)

    await prisma.shipmentAddress.delete({
      where: { id: body.id, userId },
    })

    return res.status(200).end()
  } catch (e) {
    if (e instanceof Boom) {
      return res.status(e.output.statusCode).json(e.data)
    }
    return res.status(500).json(e)
  }
}
