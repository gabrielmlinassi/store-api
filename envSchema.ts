import z from "zod"

const envSchema = z.object({
  STRIPE_SK: z.string().trim().min(1),
  PORT: z.string().default("8001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

type EnvSchemaType = z.infer<typeof envSchema>

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvSchemaType {}
  }
}

const env = envSchema.safeParse({
  STRIPE_SK: process.env.STRIPE_SK,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
})

if (!env.success) {
  console.error(env.error.issues)
  throw new Error("There is an error with the environment variables")
}

export const envServerSchema = env.data
