const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  listStatus: async (req, res, next) => {
    try {
      const statuses = await prisma.status.findMany();
      res.json(statuses);
    } catch (err) {
      next(err);
    }
  },
  listPaymentTypes: async (req, res, next) => {
    try {
      const paymentTypes = await prisma.typePayment.findMany();
      res.json(paymentTypes);
    } catch (err) {
      next(err);
    }
  },
  createStatus: async (req, res, next) => {
    try {
      const status = await prisma.status.create({
        data: req.body
      });
      res.status(201).json(status);
    } catch (err) {
      next(err);
    }
  },
  createPaymentType: async (req, res, next) => {
    try {
      const paymentType = await prisma.typePayment.create({
        data: req.body
      });
      res.status(201).json(paymentType);
    } catch (err) {
      next(err);
    }
  },
};
