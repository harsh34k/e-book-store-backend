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
exports.listAllBooks = exports.filterBook = exports.deleteBook = exports.getSingleBook = exports.listMyBooks = exports.updateBook = exports.createBook = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const http_errors_1 = __importDefault(require("http-errors"));
const bookModel_1 = __importDefault(require("./bookModel"));
const mongoose_1 = __importDefault(require("mongoose"));
const createBook = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, genre, description } = req.body;
    console.log("description", description);
    const files = req.files;
    // 'application/pdf'
    const coverImageMimeType = files.coverImage[0].mimetype.split("/").at(-1);
    const fileName = files.coverImage[0].filename;
    const filePath = node_path_1.default.resolve(__dirname, "../../public/data/uploads", fileName);
    try {
        const uploadResult = yield cloudinary_1.default.uploader.upload(filePath, {
            filename_override: fileName,
            folder: "book-covers",
            format: coverImageMimeType,
        });
        const bookFileName = files.file[0].filename;
        const bookFilePath = node_path_1.default.resolve(__dirname, "../../public/data/uploads", bookFileName);
        const bookFileUploadResult = yield cloudinary_1.default.uploader.upload(bookFilePath, {
            resource_type: "raw",
            filename_override: bookFileName,
            folder: "book-pdfs",
            format: "pdf",
        });
        const _req = req;
        const newBook = yield bookModel_1.default.create({
            title,
            genre,
            description,
            author: _req.userId,
            coverImage: uploadResult.secure_url,
            file: bookFileUploadResult.secure_url,
        });
        // Delete temp.files
        try {
            yield node_fs_1.default.promises.unlink(filePath);
            yield node_fs_1.default.promises.unlink(bookFilePath);
        }
        catch (error) {
            console.log('Error while deleting local file', error);
        }
        res.status(201).json({ id: newBook._id });
    }
    catch (err) {
        console.log(err);
        return next((0, http_errors_1.default)(500, "Error while uploading the files."));
    }
});
exports.createBook = createBook;
const updateBook = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, genre, description } = req.body;
    const bookId = req.params.bookId;
    // Check if a valid bookId is passed in url params
    if (!mongoose_1.default.isValidObjectId(bookId))
        return next((0, http_errors_1.default)(400, "A valid bookid is required"));
    const book = yield bookModel_1.default.findOne({ _id: bookId });
    if (!book) {
        return next((0, http_errors_1.default)(404, "Book not found"));
    }
    // Check access
    const _req = req;
    if (book.author.toString() !== _req.userId) {
        return next((0, http_errors_1.default)(403, "You can not update others book."));
    }
    // check if image field is exists.
    const files = req.files;
    let completeCoverImage = "";
    if (files.coverImage) {
        const filename = files.coverImage[0].filename;
        const converMimeType = files.coverImage[0].mimetype.split("/").at(-1);
        // send files to cloudinary
        const filePath = node_path_1.default.resolve(__dirname, "../../public/data/uploads/" + filename);
        completeCoverImage = filename;
        const uploadResult = yield cloudinary_1.default.uploader.upload(filePath, {
            filename_override: completeCoverImage,
            folder: "book-covers",
            format: converMimeType,
        });
        completeCoverImage = uploadResult.secure_url;
        yield node_fs_1.default.promises.unlink(filePath);
    }
    // check if file field is exists.
    let completeFileName = "";
    if (files.file) {
        const bookFilePath = node_path_1.default.resolve(__dirname, "../../public/data/uploads/" + files.file[0].filename);
        const bookFileName = files.file[0].filename;
        completeFileName = bookFileName;
        const uploadResultPdf = yield cloudinary_1.default.uploader.upload(bookFilePath, {
            resource_type: "raw",
            filename_override: completeFileName,
            folder: "book-pdfs",
            format: "pdf",
        });
        completeFileName = uploadResultPdf.secure_url;
        yield node_fs_1.default.promises.unlink(bookFilePath);
    }
    const updatedBook = yield bookModel_1.default.findOneAndUpdate({
        _id: bookId,
    }, {
        title: title,
        genre: genre,
        description: description,
        coverImage: completeCoverImage ? completeCoverImage : book.coverImage,
        file: completeFileName ? completeFileName : book.file,
    }, { new: true });
    res.json(updatedBook);
});
exports.updateBook = updateBook;
const listMyBooks = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // todo: add pagination.
        const _req = req;
        console.log(" _req.userId", _req.userId);
        const books = yield bookModel_1.default.aggregate([
            {
                $match: { author: new mongoose_1.default.Types.ObjectId(_req.userId) }
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
                $unwind: "$author" // Flatten the array into a single author object
            }
        ]);
        res.json(books);
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while getting a book"));
    }
});
exports.listMyBooks = listMyBooks;
const listAllBooks = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // todo: add pagination.
        const books = yield bookModel_1.default.find();
        console.log(books);
        res.json(books);
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while getting a book"));
    }
});
exports.listAllBooks = listAllBooks;
const getSingleBook = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const bookId = req.params.bookId;
    // Check if a valid bookId is passed in url params
    if (!mongoose_1.default.isValidObjectId(bookId))
        return next((0, http_errors_1.default)(400, "A valid bookid is required"));
    try {
        const book = yield bookModel_1.default.aggregate([
            {
                $match: { _id: new mongoose_1.default.Types.ObjectId(bookId) }
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
                $unwind: "$author" // Flatten the array into a single author object
            }
        ]);
        if (!book) {
            return next((0, http_errors_1.default)(404, "Book not found."));
        }
        return res.json(book);
    }
    catch (err) {
        return next((0, http_errors_1.default)(500, "Error while getting a book"));
    }
});
exports.getSingleBook = getSingleBook;
const deleteBook = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const bookId = req.params.bookId;
    // Check if a valid bookId is passed in url params
    if (!mongoose_1.default.isValidObjectId(bookId))
        return next((0, http_errors_1.default)(400, "A valid bookid is required"));
    const book = yield bookModel_1.default.findOne({ _id: bookId });
    if (!book) {
        return next((0, http_errors_1.default)(404, "Book not found"));
    }
    // Check Access
    const _req = req;
    if (book.author.toString() !== _req.userId) {
        return next((0, http_errors_1.default)(403, "You can not update others book."));
    }
    // book-covers/dkzujeho0txi0yrfqjsm
    // https://res.cloudinary.com/degzfrkse/image/upload/v1712590372/book-covers/u4bt9x7sv0r0cg5cuynm.png
    const coverFileSplits = book.coverImage.split("/");
    const coverImagePublicId = coverFileSplits.at(-2) + "/" + ((_a = coverFileSplits.at(-1)) === null || _a === void 0 ? void 0 : _a.split(".").at(-2));
    const bookFileSplits = book.file.split("/");
    const bookFilePublicId = bookFileSplits.at(-2) + "/" + bookFileSplits.at(-1);
    console.log("bookFilePublicId", bookFilePublicId);
    try {
        yield cloudinary_1.default.uploader.destroy(coverImagePublicId);
        yield cloudinary_1.default.uploader.destroy(bookFilePublicId, {
            resource_type: "raw",
        });
    }
    catch (error) {
        console.log('Error while deleting File from cloudinary', error);
    }
    try {
        yield bookModel_1.default.deleteOne({ _id: bookId });
    }
    catch (error) {
        console.log('Error while deleting a Book', error);
    }
    return res.sendStatus(204);
});
exports.deleteBook = deleteBook;
// filter book
const filterBook = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("atleast reached here");
    try {
        const title = req.query.title;
        console.log("tiitle", title);
        // Build the filter object for Prisma
        const filters = {};
        if (title) {
            filters.title = {
                contains: title,
                mode: "insensitive"
            };
        }
        // Fetch filtered jobs from Prisma
        const books = yield bookModel_1.default.find({
            title
        });
        if (!books || books.length === 0) {
            return next((0, http_errors_1.default)(404, "Book not found"));
        }
        res.json(books);
    }
    catch (error) {
        console.error('Error filtering jobs:', error);
        return next((0, http_errors_1.default)(500, "Internal server Error"));
    }
});
exports.filterBook = filterBook;
