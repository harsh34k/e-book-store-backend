"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_errors_1 = __importDefault(require("http-errors"));
const jsonwebtoken_1 = require("jsonwebtoken");
const config_1 = require("../config/config");
const authenticate = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
        return next((0, http_errors_1.default)(401, "Authorization token is required."));
    }
    try {
        const parsedToken = token.split(" ")[1];
        const decoded = (0, jsonwebtoken_1.verify)(parsedToken, config_1.config.jwtSecret);
        const _req = req;
        _req.userId = decoded.sub;
        console.log(" _req.userId from authenticate", _req.userId);
        next();
    }
    catch (err) {
        return next((0, http_errors_1.default)(401, "Token expired."));
    }
};
exports.default = authenticate;
