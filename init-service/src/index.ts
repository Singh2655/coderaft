import { copyS3Folder } from "./aws";
import express, { Request, Response } from "express"; // Import types
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.post("/project", async (req: Request, res: Response) => {
  const { replId, language } = req.body;

  if (!replId) {
    res.status(400).send("Bad request");
    return;
  }

  await copyS3Folder(`base/${language}`, `code/${replId}`);

  res.send("Project created");
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`listening on *:${port}`);
});
