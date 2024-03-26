import { z } from "zod"

export const signinSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string(),
    })
    .strict(),
})

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
    name: z.string(),
  }),
})

export const passwordRecoverySchema = z.object({
  body: z
    .object({
      email: z.string().email(),
    })
    .strict(),
})

export const changePasswordSchema = z.object({
  body: z.discriminatedUnion("flow", [
    z
      .object({
        flow: z.literal("password-recovery"),
        email: z.string().email(),
        password: z.string(),
        confirmPassword: z.string(),
        recoveryToken: z.string(),
      })
      .strict(),
    z
      .object({
        flow: z.literal("default"),
        email: z.string().email(),
        password: z.string(),
        confirmPassword: z.string(),
      })
      .strict(),
  ]),
})

export const addItemToCartSchema = z.object({
  body: z.object({
    productId: z.number(),
    quantity: z.number(),
  }),
})

export const changeQuantitySchema = z.object({
  body: z.object({
    productId: z.number(),
    quantity: z.number(),
  }),
})

export const deleteItemFromCartSchema = z.object({
  body: z.object({
    productId: z.number(),
  }),
})

export const shippingAddressSchema = z.object({
  body: z.object({
    name: z.string(),
    isDefault: z.boolean().optional(),
    address: z.string(),
    zip: z.string(),
    number: z.number(),
    complement: z.string().optional(),
  }),
})

export const editShippingAddressSchema = z.object({
  body: z
    .object({
      id: z.number(),
      isDefault: z.boolean().optional(),
      address: z.string().min(12, { message: "Address must have at least 12 characters" }).optional(),
      zip: z.string().optional(),
      number: z.number().optional(),
      complement: z.string().optional(),
    })
    .strict(),
})

export const deleteShippingAddressSchema = z.object({
  body: z.object({ id: z.number() }).strict(),
})

export const getProductsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
  }),
})

/**
 *
 */

export const GetOrderShema = z.object({
  params: z.object({
    id: z.string(),
  }),
})

export const CreateOrderSchema = z.object({
  body: z.object({
    id: z.number(),
  }),
})

export const EditOrderSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
})

export const CompleteOrderSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    paymentMethodId: z.string(),
  }),
})

/**
 *
 *
 */
export const StripeWebhookSchema = z.object({
  body: z
    .object({
      type: z.enum(["payment_intent.succeeded", "payment_method.attached"]),
    })
    .strict(),
})
