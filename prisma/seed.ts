import { faker } from "@faker-js/faker"
import { Prisma, PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

const users: Prisma.UserCreateInput[] = []
const products: Prisma.ProductCreateInput[] = []

const amountOfUsers = 30
const amountOfProducts = 100

for (let idx = 0; idx < amountOfUsers; idx++) {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()

  users.push({
    name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    password: bcrypt.hashSync("123", 10),
  })
}

for (let idx = 0; idx < amountOfProducts; idx++) {
  products.push({
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: Number(faker.finance.amount({ min: 50, max: 1000, dec: 2 })) * 100,
    url: faker.image.url(),
  })
}

async function main() {
  const dbUsers = await prisma.user.createMany({
    data: users,
  })

  const dbProducts = await prisma.product.createMany({
    data: products,
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
