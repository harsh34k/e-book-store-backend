import path from "node:path";
import fs from "node:fs";
import { Request, Response, NextFunction } from "express";
import cloudinary from "../config/cloudinary";
import createHttpError from "http-errors";
import bookModel from "./bookModel";
import { AuthRequest } from "../middlewares/authenticate";
import mongoose from "mongoose";

const createBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, genre, description } = req.body;
  console.log("description", description);

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  // 'application/pdf'
  const coverImageMimeType = files.coverImage[0].mimetype.split("/").at(-1);
  const fileName = files.coverImage[0].filename;
  const filePath = path.resolve(
    __dirname,
    "../../public/data/uploads",
    fileName
  );

  try {
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      filename_override: fileName,
      folder: "book-covers",
      format: coverImageMimeType,
    });

    const bookFileName = files.file[0].filename;
    const bookFilePath = path.resolve(
      __dirname,
      "../../public/data/uploads",
      bookFileName
    );

    const bookFileUploadResult = await cloudinary.uploader.upload(
      bookFilePath,
      {
        resource_type: "raw",
        filename_override: bookFileName,
        folder: "book-pdfs",
        format: "pdf",
      }
    );
    const _req = req as AuthRequest;

    const newBook = await bookModel.create({
      title,
      genre,
      description,
      author: _req.userId,
      coverImage: uploadResult.secure_url,
      file: bookFileUploadResult.secure_url,
    });

    // Delete temp.files

    try {
      await fs.promises.unlink(filePath);
      await fs.promises.unlink(bookFilePath);
    } catch (error) {
      console.log('Error while deleting local file', error);
    }


    res.status(201).json({ id: newBook._id });
  } catch (err) {
    console.log(err);
    return next(createHttpError(500, "Error while uploading the files."));
  }
};

const updateBook = async (req: Request, res: Response, next: NextFunction) => {
  const { title, genre, description } = req.body;
  const bookId = req.params.bookId;

  // Check if a valid bookId is passed in url params
  if (!mongoose.isValidObjectId(bookId)) return next(createHttpError(400, "A valid bookid is required"));

  const book = await bookModel.findOne({ _id: bookId });

  if (!book) {
    return next(createHttpError(404, "Book not found"));
  }

  // Check access
  const _req = req as AuthRequest;
  if (book.author.toString() !== _req.userId) {
    return next(createHttpError(403, "You can not update others book."));
  }

  // check if image field is exists.

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  let completeCoverImage = "";
  if (files.coverImage) {
    const filename = files.coverImage[0].filename;
    const converMimeType = files.coverImage[0].mimetype.split("/").at(-1);
    // send files to cloudinary
    const filePath = path.resolve(
      __dirname,
      "../../public/data/uploads/" + filename
    );
    completeCoverImage = filename;
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      filename_override: completeCoverImage,
      folder: "book-covers",
      format: converMimeType,
    });

    completeCoverImage = uploadResult.secure_url;
    await fs.promises.unlink(filePath);
  }

  // check if file field is exists.
  let completeFileName = "";
  if (files.file) {
    const bookFilePath = path.resolve(
      __dirname,
      "../../public/data/uploads/" + files.file[0].filename
    );

    const bookFileName = files.file[0].filename;
    completeFileName = bookFileName;

    const uploadResultPdf = await cloudinary.uploader.upload(bookFilePath, {
      resource_type: "raw",
      filename_override: completeFileName,
      folder: "book-pdfs",
      format: "pdf",
    });

    completeFileName = uploadResultPdf.secure_url;
    await fs.promises.unlink(bookFilePath);
  }

  const updatedBook = await bookModel.findOneAndUpdate(
    {
      _id: bookId,
    },
    {
      title: title,
      genre: genre,
      description: description,
      coverImage: completeCoverImage ? completeCoverImage : book.coverImage,
      file: completeFileName ? completeFileName : book.file,
    },
    { new: true }
  );

  res.json(updatedBook);
};

const listMyBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // todo: add pagination.
    const _req = req as AuthRequest;
    console.log(" _req.userId", _req.userId);

    const books = await bookModel.aggregate([
      {
        $match: { author: new mongoose.Types.ObjectId(_req.userId) }
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
          pipeline: [{
            $project: {
              name: 1,
              email: 1
            }
          }]
        }
      },
      {
        $unwind: "$author"  // Flatten the array into a single author object
      }
    ]);

    res.json(books);
  } catch (err) {
    return next(createHttpError(500, "Error while getting a book"));
  }
};
const listAllBooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // todo: add pagination.
    const books = await bookModel.find();
    console.log(books);


    res.json(books);
  } catch (err) {
    return next(createHttpError(500, "Error while getting a book"));
  }
};


const getSingleBook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bookId = req.params.bookId;

  // Check if a valid bookId is passed in url params
  if (!mongoose.isValidObjectId(bookId)) return next(createHttpError(400, "A valid bookid is required"));

  try {

    const book = await bookModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(bookId) }
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
          pipeline: [{
            $project: {
              name: 1,
              email: 1
            }
          }]
        }
      },
      {
        $unwind: "$author"  // Flatten the array into a single author object
      }
    ]);
    if (!book) {
      return next(createHttpError(404, "Book not found."));
    }

    return res.json(book);
  } catch (err) {
    return next(createHttpError(500, "Error while getting a book"));
  }
};

const deleteBook = async (req: Request, res: Response, next: NextFunction) => {
  const bookId = req.params.bookId;

  // Check if a valid bookId is passed in url params
  if (!mongoose.isValidObjectId(bookId)) return next(createHttpError(400, "A valid bookid is required"));

  const book = await bookModel.findOne({ _id: bookId });
  if (!book) {
    return next(createHttpError(404, "Book not found"));
  }

  // Check Access
  const _req = req as AuthRequest;
  if (book.author.toString() !== _req.userId) {
    return next(createHttpError(403, "You can not update others book."));
  }
  // book-covers/dkzujeho0txi0yrfqjsm
  // https://res.cloudinary.com/degzfrkse/image/upload/v1712590372/book-covers/u4bt9x7sv0r0cg5cuynm.png

  const coverFileSplits = book.coverImage.split("/");
  const coverImagePublicId =
    coverFileSplits.at(-2) + "/" + coverFileSplits.at(-1)?.split(".").at(-2);

  const bookFileSplits = book.file.split("/");
  const bookFilePublicId = bookFileSplits.at(-2) + "/" + bookFileSplits.at(-1);
  console.log("bookFilePublicId", bookFilePublicId);

  try {
    await cloudinary.uploader.destroy(coverImagePublicId);
    await cloudinary.uploader.destroy(bookFilePublicId, {
      resource_type: "raw",
    });
  } catch (error) {
    console.log('Error while deleting File from cloudinary', error);
  }

  try {
    await bookModel.deleteOne({ _id: bookId });
  } catch (error) {
    console.log('Error while deleting a Book', error);
  }


  return res.sendStatus(204);
};

// filter book
const filterBook = async (req: Request, res: Response, next: NextFunction) => {
  console.log("atleast reached here");

  try {
    const title = req.query.title as string;
    console.log("tiitle", title);


    // Build the filter object for Prisma
    const filters: any = {};

    if (title) {
      filters.title = {
        contains: title,
        mode: "insensitive"
      };
    }

    // Fetch filtered jobs from Prisma
    const books = await bookModel.find({
      title
    });
    if (!books || books.length === 0) {
      return next(createHttpError(404, "Book not found"));
    }

    res.json(books);
  } catch (error) {
    console.error('Error filtering jobs:', error);
    return next(createHttpError(500, "Internal server Error"));
  }
};



export { createBook, updateBook, listMyBooks, getSingleBook, deleteBook, filterBook, listAllBooks };
