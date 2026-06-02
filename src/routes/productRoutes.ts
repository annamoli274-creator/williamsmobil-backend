import express, { Router } from "express";
import type { Request, Response } from "express";
import { Product } from "../models/index";   // corrected import

const router = Router();

/* GET /api/products */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const products = await Product.findAll();
        res.json({ items: products });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

/* POST /api/products */
router.post("/", async (req: Request, res: Response) => {
    try {
        const created = await Product.create(req.body);
        res.status(201).json(created);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "DonnÃ©es invalides" });
    }
});

export default router;
