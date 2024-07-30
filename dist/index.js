"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const globalErrorHandler_1 = __importDefault(require("./middlewares/globalErrorHandler"));
const userRouter_1 = __importDefault(require("./user/userRouter"));
const bookRouter_1 = __importDefault(require("./book/bookRouter"));
const config_1 = require("./config/config");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: config_1.config.frontendDomain,
}));
app.use(express_1.default.json());
// Routes
// Http methods: GET, POST, PUT, PATCH, DELETE
app.get("/", (req, res, next) => {
    res.json({ message: "Welcome to elib apis" });
});
app.use("/api/users", userRouter_1.default);
app.use("/api/books", bookRouter_1.default);
// Global error handler
app.use(globalErrorHandler_1.default);
exports.default = app;
