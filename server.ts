import app from "./src/index";
import { config } from "./src/config/config";
import connectDB from "./src/config/db";

const startServer = async () => {
  // Connect database
  await connectDB();

  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
  });
};

startServer();
