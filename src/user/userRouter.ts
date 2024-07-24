import express from "express";
import { createUser, loginUser, updateAccountDetails } from "./userController";

const userRouter = express.Router();

// routes
userRouter.post("/register", createUser);
userRouter.post("/login", loginUser);
userRouter.patch("/updateDetails", updateAccountDetails);

export default userRouter;
