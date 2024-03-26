import dotenv from "dotenv"
dotenv.config()

import express, { Application } from "express"
import genFunc from "connect-pg-simple"
import cookieParser from "cookie-parser"
import session from "express-session"
import cors from "cors"

import { router } from "./routes"

const PostgresqlStore = genFunc(session)

const sessionStore = new PostgresqlStore({
  conString: "postgres://postgres:postgres@localhost:5432/store",
  tableName: "sessions",
  createTableIfMissing: true,
})

const app: Application = express()
const port = process.env.PORT || 8000

app.use(cookieParser())

app.use(
  session({
    secret: "caramelo",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      sameSite: false,
      secure: process.env.NODE_ENV === "production",
      httpOnly: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 24h
    },
  })
)

app.use(
  cors({
    origin: "http://localhost:8001",
    methods: ["POST", "PUT", "GET", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    credentials: true,
  })
)

app.use("/api", router)

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`)
})
