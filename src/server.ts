import app from "./index";
import { config } from "./config/config";
import connectDB from "./config/db";

const startServer = async () => {
  // Connect database
  await connectDB();

  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
  });
};

startServer();
