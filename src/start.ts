import dotenv from "dotenv";
import {App} from "./app";

// Load .env file
dotenv.config()
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || '3000');

new App().listen(host, port);
