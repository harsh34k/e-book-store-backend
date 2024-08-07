import path from "node:path";
import express from "express";
import {
  createBook,
  deleteBook,
  filterBook,
  getSingleBook,
  listAllBooks,
  listMyBooks,
  updateBook,
} from "./bookController";
import multer from "multer";
import authenticate from "../middlewares/authenticate";

const bookRouter = express.Router();

// file store local ->
const upload = multer({
  dest: path.resolve(__dirname, "../../public/data/uploads"),
  limits: { fileSize: 1e7 }, // setting up 10mb mx uplod filesize
});
// routes
// /api/books
bookRouter.post(
  "/",
  authenticate,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  createBook
);
bookRouter.get("/search", filterBook)

bookRouter.patch(
  "/:bookId",
  authenticate,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  updateBook
);

bookRouter.get("/", authenticate, listMyBooks);
bookRouter.get("/all", listAllBooks);
bookRouter.get("/:bookId", getSingleBook);


bookRouter.delete("/:bookId", authenticate, deleteBook);

export default bookRouter;
