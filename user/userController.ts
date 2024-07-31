import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import userModel from "./userModel";
import { sign } from "jsonwebtoken";
import { config } from "../config/config";
import { User } from "./userTypes";
import { AuthRequest } from "../middlewares/authenticate";
import mongoose from "mongoose";

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    const error = createHttpError(400, "All fields are required");
    return next(error);
  }

  // Database call.
  try {
    const user = await userModel.findOne({ email });
    if (user) {
      const error = createHttpError(
        400,
        "User already exists with this email."
      );
      return next(error);
    }
  } catch (err) {
    console.log("Error details:", err);
    return next(createHttpError(500, "Error while getting user"));
  }

  /// password -> hash

  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("details", name, email, hashedPassword);


  let newUser;
  try {
    newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });
  } catch (err) {
    console.log("Error details:", err);
    return next(createHttpError(500, "Error while creating user."));
  }

  try {
    // Token generation JWT
    const token = sign({ sub: newUser._id }, config.jwtSecret as string, {
      expiresIn: "7d",
      algorithm: "HS256",
    });
    // Response
    res.status(201).json({ accessToken: token });
  } catch (err) {
    return next(createHttpError(500, "Error while signing the jwt token"));
  }
};

const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(createHttpError(400, "All fields are required"));
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return next(createHttpError(404, "User not found."));
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return next(createHttpError(400, "Username or password incorrect from hashedPassword!"));
    }

    // Create accesstoken
    try {
      const token = sign({ sub: user._id }, config.jwtSecret as string, {
        expiresIn: "7d",
        algorithm: "HS256",
      });
      return res.json({ accessToken: token });
    } catch (error) {
      return next(createHttpError(500, "Error in generating access token"));
    }
  } catch (error) {
    return next(createHttpError(500, "Error in Login User"));
  }
};

const updateAccountDetails = async (req: Request, res: Response, next: NextFunction) => {
  console.log("here in updateAccout Details");

  const { email, oldPassword, newPassword } = req.body;

  // Check if at least one field is provided
  if (!oldPassword && !email && newPassword) {
    return next(createHttpError(400, "Please provide all the details"));
  }
  //check if the user exists
  const user = await userModel.findOne({ email });
  if (!user) {
    return next(createHttpError(404, "User not found."));
  }
  //check if the password is correct
  console.log("yha tk to phuch gye");
  console.log("email", email);
  console.log("oldPassword", oldPassword);
  console.log("NewPassword", newPassword);

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return next(createHttpError(400, "Username or password incorrect!"));
  }
  //update the user details
  try {
    const updatedUser = await userModel.findOneAndUpdate(
      { email },
      { $set: { email, password: newPassword } },
      { new: true }
    );
    return res.json({ message: "User details updated successfully" });
  } catch (error) {
    return next(createHttpError(500, "Error in updating user details"));
  }
};

export { createUser, loginUser, updateAccountDetails };
