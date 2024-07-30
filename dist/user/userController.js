"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAccountDetails = exports.loginUser = exports.createUser = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const userModel_1 = __importDefault(require("./userModel"));
const jsonwebtoken_1 = require("jsonwebtoken");
const config_1 = require("../config/config");
const createUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = req.body;
    // Validation
    if (!name || !email || !password) {
        const error = (0, http_errors_1.default)(400, "All fields are required");
        return next(error);
    }
    // Database call.
    try {
        const user = yield userModel_1.default.findOne({ email });
        if (user) {
            const error = (0, http_errors_1.default)(400, "User already exists with this email.");
            return next(error);
        }
    }
    catch (err) {
        console.log("Error details:", err);
        return next((0, http_errors_1.default)(500, "Error while getting user"));
    }
    /// password -> hash
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    console.log("details", name, email, hashedPassword);
    let newUser;
    try {
        newUser = yield userModel_1.default.create({
            name,
            email,
            password: hashedPassword,
        });
    }
    catch (err) {
        console.log("Error details:", err);
        return next((0, http_errors_1.default)(500, "Error while creating user."));
    }
    try {
        // Token generation JWT
        const token = (0, jsonwebtoken_1.sign)({ sub: newUser._id }, config_1.config.jwtSecret, {
            expiresIn: "7d",
            algorithm: "HS256",
        });
        // Response
        res.status(201).json({ accessToken: token });
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while signing the jwt token"));
    }
});
exports.createUser = createUser;
const loginUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return next((0, http_errors_1.default)(400, "All fields are required"));
    }
    try {
        const user = yield userModel_1.default.findOne({ email });
        if (!user) {
            return next((0, http_errors_1.default)(404, "User not found."));
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return next((0, http_errors_1.default)(400, "Username or password incorrect from hashedPassword!"));
        }
        // Create accesstoken
        try {
            const token = (0, jsonwebtoken_1.sign)({ sub: user._id }, config_1.config.jwtSecret, {
                expiresIn: "7d",
                algorithm: "HS256",
            });
            return res.json({ accessToken: token });
        }
        catch (error) {
            return next((0, http_errors_1.default)(500, "Error in generating access token"));
        }
    }
    catch (error) {
        return next((0, http_errors_1.default)(500, "Error in Login User"));
    }
});
exports.loginUser = loginUser;
const updateAccountDetails = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("here in updateAccout Details");
    const { email, oldPassword, newPassword } = req.body;
    // Check if at least one field is provided
    if (!oldPassword && !email && newPassword) {
        return next((0, http_errors_1.default)(400, "Please provide all the details"));
    }
    //check if the user exists
    const user = yield userModel_1.default.findOne({ email });
    if (!user) {
        return next((0, http_errors_1.default)(404, "User not found."));
    }
    //check if the password is correct
    console.log("yha tk to phuch gye");
    console.log("email", email);
    console.log("oldPassword", oldPassword);
    console.log("NewPassword", newPassword);
    const isMatch = yield bcrypt_1.default.compare(oldPassword, user.password);
    if (!isMatch) {
        return next((0, http_errors_1.default)(400, "Username or password incorrect!"));
    }
    //update the user details
    try {
        const updatedUser = yield userModel_1.default.findOneAndUpdate({ email }, { $set: { email, password: newPassword } }, { new: true });
        return res.json({ message: "User details updated successfully" });
    }
    catch (error) {
        return next((0, http_errors_1.default)(500, "Error in updating user details"));
    }
});
exports.updateAccountDetails = updateAccountDetails;
