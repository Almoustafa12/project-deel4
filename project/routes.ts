import express from "express";
import { Collection, MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import { Root2, Expense, PaymentMethod, CardDetails } from "./types";


const uri = "mongodb+srv://almoustafaelhandouz:webontwikkeling435@web-ontwikkeling.6dcvo.mongodb.net/";
const client = new MongoClient(uri);
const collection: Collection<Root2> = client.db("Expenses").collection<Root2>("Users");

const router = express.Router();


declare module "express-session" {
    interface SessionData {
        userId: string | null;
    }
}


async function generateExpenses(userId: string): Promise<Root2 | null> {
    return await collection.findOne({ id: userId });
}

async function addExpense(userId: string, expense: Expense) {
    await collection.updateOne({ id: userId }, { $push: { expenses: expense } });
}

async function deleteExpense(userId: string, idExpense: string) {
    await collection.updateOne({ id: userId }, { $pull: { expenses: { id: idExpense } } });
}

function ensureAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
    const userId = req.session.userId;
    if (typeof userId === "string") {
        return next();
    }
    res.redirect("/login");
}


router.get("/", (req, res) => {
    res.redirect("/login");
});

router.get("/login", (req, res) => {
    if (req.session.userId) {
        return res.redirect("/dashboard");
    }
    res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await collection.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.id;
        return res.redirect("/dashboard");
    }
    res.render("login", { error: "Email of wachtwoord is fout" });
});

router.get("/register", (req, res) => {
    if (req.session.userId) {
        return res.redirect("/dashboard");
    }
    res.render("register", { error: null });
});

router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (await collection.findOne({ email })) {
        return res.render("register", { error: "Email bestaat al" });
    } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        await collection.insertOne({
            id: `user${Date.now()}`,
            name,
            email,
            password: hashedPassword,
            expenses: [],
            budget: { monthlyLimit: 0, notificationThreshold: 0.8, isActive: false },
        });
        res.redirect("/login");
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

router.get("/dashboard", ensureAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    if (typeof userId !== "string") {
        return res.redirect("/login");
    }

    const user = await generateExpenses(userId);
    if (!user) {
        return res.redirect("/login");
    }
    res.render("home", { expenses: user.expenses, user });
});

router.get("/expenses/add", ensureAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    if (typeof userId !== "string") {
        return res.redirect("/login");
    }

    const user = await generateExpenses(userId);
    if (!user) {
        return res.redirect("/login");
    }

    res.render("add-expense");
});

router.post("/expenses/add", ensureAuthenticated, async (req, res) => {
    const userId = req.session.userId;

    if (typeof userId !== "string") {
        return res.redirect("/login");
    }

    const user = await generateExpenses(userId);
    if (!user) {
        return res.redirect("/login");
    }

    let id = req.body.id || `${user.expenses.length + 1}`;
    const isIncoming = req.body.isIncoming === "Ja";
    const isPaid = req.body.isPaid === "Ja";

    const cardDetails: CardDetails = {
        number: req.body.cardNumber,
        expiry: req.body.expiryDate,
    };

    const paymentMethod: PaymentMethod = {
        method: req.body.paymentMethod,
        cardDetails,
    };

    const expense: Expense = {
        id,
        description: req.body.description,
        amount: req.body.amount,
        date: req.body.date,
        currency: req.body.currency,
        paymentMethod: paymentMethod.method,
        isIncoming,
        category: req.body.category,
        tags: req.body.tags ? req.body.tags.split(",") : [],
        isPaid,
    };


    if (!Array.isArray(user.expenses)) {
        user.expenses = [];
    }

    await addExpense(user.id, expense);
    res.redirect("/dashboard");
});

router.get("/expenses/:sort", ensureAuthenticated, async (req, res) => {
    const sort: number = parseInt(req.params.sort);
    const userId = req.session.userId;

    if (typeof userId !== "string") {
        return res.redirect("/login");
    }

    const user = await generateExpenses(userId);
    if (!user) {
        return res.redirect("/login");
    }

    res.render("view-expenses", { expenses: user.expenses, sort });
});

router.post("/expenses/search", ensureAuthenticated, async (req, res) => {
    const tag = req.body.search;
    const userId = req.session.userId;

    if (typeof userId !== "string") {
        return res.redirect("/login");
    }

    const user = await generateExpenses(userId);
    if (!user) {
        return res.redirect("/login");
    }

    const foundExpense = user.expenses.find((element) => element.description === tag);
    if (foundExpense) {
        res.render("search-results", { expense: foundExpense });
    } else {
        res.render("search-results", { expense: null });
    }
});

router.post("/expenses/:id/delete", ensureAuthenticated, async (req, res) => {
    const userId = req.session.userId;

    if (typeof userId !== "string") {
        return res.redirect("/login");
    }

    const user = await generateExpenses(userId);
    if (!user) {
        return res.redirect("/login");
    }

    const id: string = req.params.id;
    await deleteExpense(user.id, id);
    res.redirect("/expenses/0");
});

router.get("/expenses/:id/update", ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        if (typeof userId !== "string") {
            return res.redirect("/login");
        }

        const user = await generateExpenses(userId);
        if (!user) {
            return res.redirect("/login");
        }

        const expenseId = req.params.id;
        const expense = user.expenses.find((e) => e.id === expenseId);

        if (!expense) {
            throw new Error("Expense not found");
        }

        res.render("update-expense", { expense });
    } catch (error) {
        console.error(error);
    }
});

router.post("/expenses/:id/update", ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        if (typeof userId !== "string") {
            return res.redirect("/login");
        }

        const user = await generateExpenses(userId);
        if (!user) {
            return res.redirect("/login");
        }

        const expenseId = req.params.id;
        const expenseIndex = user.expenses.findIndex((e) => e.id === expenseId);

        if (expenseIndex === -1) {
            throw new Error("Expense not found");
        }

        const updatedExpense = {
            ...user.expenses[expenseIndex],
            description: req.body.description,
            amount: req.body.amount,
            currency: req.body.currency,
            date: req.body.date,
            category: req.body.category,
            tags: req.body.tags ? req.body.tags.split(",") : [],
        };

        user.expenses[expenseIndex] = updatedExpense;

        await collection.updateOne({ id: userId }, { $set: { expenses: user.expenses } });

        res.redirect("/expenses/0");
    } catch (error) {
        console.error(error);
    }
});

export default router;
