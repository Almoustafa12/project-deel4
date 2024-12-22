import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import routes from "./routes";

dotenv.config();
const app = express();
const uri = "mongodb+srv://almoustafaelhandouz:webontwikkeling435@web-ontwikkeling.6dcvo.mongodb.net/";
const client = new MongoClient(uri);

app.set("port", 3000);
app.set("view engine", "ejs");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
}));


app.use("/", routes);


async function connect() {
    try {
        await client.connect();
        console.log("Connected to database");
        process.on("SIGINT", exit);
    } catch (error) {
        console.error(error);
    }
}

async function exit() {
    try {
        await client.close();
        console.log("Disconnected from database");
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

app.listen(app.get("port"), () =>
    console.log("[server] http://localhost:" + app.get("port"))
);