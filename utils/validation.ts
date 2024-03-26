import type { Request } from "express"
import { AnyZodObject, ZodError, z } from "zod"
import { badRequest } from "@hapi/boom"

export async function zParse<T extends AnyZodObject>(schema: T, req: Request): Promise<z.infer<T>> {
  try {
    return await schema.parseAsync(req)
  } catch (e) {
    if (e instanceof ZodError) {
      const error = badRequest(undefined, e.errors)
      error.output.payload.custom = e.errors
      throw error
    }
    return badRequest(JSON.stringify(e))
  }
}
