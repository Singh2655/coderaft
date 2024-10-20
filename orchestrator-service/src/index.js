const dockerode = require("dockerode");
const cors = require("cors");
const express = require("express");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const Image = "repl-lit-backend";
const NETWORK_NAME = "repl-lit-network";

const app = express();
const docker = new dockerode();

app.use(express.json());
app.use(cors());
// POST /container: Spin up a new Docker container
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// app.post("/container", async (req, res) => {
//   const { replId } = req.body;
//   try {
//     // Define the volume name
//     const volumeName = "workspace-volume";

//     // Create the container with volume mounted and workspace directory created
//     const container = await docker.createContainer({
//       Image: Image, // Specify the image for the container
//       name: replId, // Set the container name to `replId`
//       Tty: true, // Enable an interactive terminal
//       HostConfig: {
//         NetworkMode: NETWORK_NAME, // Use the specified network
//         Binds: [`${volumeName}:/workspace`], // Mount the volume to /workspace
//         PortBindings: {}, // Empty port bindings
//       },
//       ConsoleSize: [44, 156], // Set custom console size
//     });

//     // Start the container
//     await container.start();
//     console.log("Container started with volume mounted!!!");

//     // Fetch folder from S3
//     const s3Params = {
//       Bucket: process.env.S3_BUCKET, // replace with your S3 bucket name
//       Prefix: `code/${replId}/`, // Folder in S3 corresponding to replId
//     };

//     const s3Data = await s3.listObjectsV2(s3Params).promise();
//     console.log(
//       `Fetched S3 objects: ${s3Data.Contents.map((item) => item.Key)}`
//     );

//     // Download each file and save to the /workspace directory
//     for (const item of s3Data.Contents) {
//       const fileKey = item.Key;
//       const relativePath = fileKey.replace(`code/${replId}/`, "");

//       // Check if it's a folder by seeing if the key ends with a `/`
//       if (fileKey.endsWith("/")) {
//         console.log(`Found directory: ${fileKey}`);
//       } else {
//         const fileDir = path.dirname(relativePath);
//         const dirPath = path.join(
//           "/var/lib/docker/volumes/",
//           volumeName,
//           "_data",
//           "workspace",
//           fileDir
//         );
//         if (!fs.existsSync(dirPath)) {
//           fs.mkdirSync(dirPath, { recursive: true });
//         }

//         // Get the object from S3 and write the file
//         const s3FileData = await s3
//           .getObject({
//             Bucket: s3Params.Bucket,
//             Key: fileKey,
//           })
//           .promise();

//         const filePath = path.join(
//           "/var/lib/docker/volumes/",
//           volumeName,
//           "_data",
//           "workspace",
//           relativePath
//         );

//         console.log(`Writing file to: ${filePath}`);
//         fs.writeFileSync(filePath, s3FileData.Body);
//       }
//     }

//     // Execute `ls` inside the container to verify files exist in /workspace
//     const exec = await container.exec({
//       Cmd: ["ls", "-R", "/workspace"],
//       AttachStdout: true,
//       AttachStderr: true,
//     });

//     const stream = await exec.start({ Detach: false });
//     stream.setEncoding("utf8");

//     let containerOutput = "";

//     stream.on("data", (chunk) => {
//       containerOutput += chunk;
//     });

//     stream.on("end", () => {
//       console.log("Container file list:", containerOutput);

//       // Send a success response after the stream ends
//       res.status(201).json({
//         status: "success",
//         message: `Container ${replId} created and started with /workspace mounted and S3 content downloaded.`,
//         containerId: container.id,
//         fileList: containerOutput,
//       });
//     });

//     stream.on("error", (err) => {
//       console.error("Error while listing files in container:", err);
//       res.status(500).json({
//         status: "error",
//         message: "Error listing files in container",
//         error: err.message,
//       });
//     });
//   } catch (error) {
//     console.error("Error creating container or downloading S3 content:", error);
//     res.status(500).json({
//       status: "error",
//       message: "Error creating container or downloading S3 content",
//       error: error.message,
//     });
//   }
// });

app.post("/container", async (req, res) => {
  const { replId } = req.body; // Assuming replId comes in the request body
  const existingContainer = await docker.listContainers({
    all: true, // List all containers, including stopped ones
    filters: { name: [replId] }, // Filter by name
  });

  if (existingContainer.length > 0) {
    return res.status(409).json({
      status: "error",
      message: `Container with name ${replId} already exists. Please remove or rename the container.`,
    });
  }

  try {
    // Create and start the container
    const container = await docker.createContainer({
      Image: Image, // Specify the image for the container
      name: replId, // Set the container name to replId
      Tty: true, // Enable an interactive terminal
      HostConfig: {
        NetworkMode: NETWORK_NAME, // Use the specified network
        PortBindings: {}, // Empty port bindings
      },
      ConsoleSize: [44, 156], // Set custom console size
    });

    await container.start();
    console.log("Container started!!!");

    // Fetch folder from S3
    const s3Params = {
      Bucket: process.env.S3_BUCKET, // replace with your S3 bucket name
      Prefix: `code/${replId}/`, // Folder in S3 corresponding to replId
    };

    const s3Data = await s3.listObjectsV2(s3Params).promise();
    console.log(
      "Fetched S3 objects:",
      s3Data.Contents.map((item) => item.Key)
    );

    // Function to execute commands in the container
    const execCommandInContainer = async (container, command) => {
      return new Promise((resolve, reject) => {
        try {
          container.exec(
            {
              Cmd: ["sh", "-c", command],
              AttachStdout: true,
              AttachStderr: true,
            },
            (err, exec) => {
              if (err) {
                return reject(err);
              }

              exec.start((err, stream) => {
                if (err) {
                  return reject(err);
                }

                let output = "";

                stream.on("data", (chunk) => {
                  output += chunk.toString();
                });

                stream.on("end", () => {
                  console.log(`Finished executing command: ${command}`);
                  resolve(output); // Resolve promise after the stream ends
                });

                stream.on("error", (err) => {
                  console.error(`Error during exec: ${err.message}`);
                  reject(err); // Reject promise if there's an error
                });

                stream.on("close", () => {
                  console.log(`Stream closed for command: ${command}`);
                  resolve(output); // Resolve in case 'close' event fires instead of 'end'
                });
              });
            }
          );
        } catch (error) {
          console.error(`Error executing command: ${command}`, error);
          reject(error);
        }
      });
    };

    // Recursive function to handle files and directories
    for (const [index, item] of s3Data.Contents.entries()) {
      const fileKey = item.Key;
      const relativePath = fileKey.replace(`code/${replId}/`, "");

      if (fileKey.endsWith("/")) {
        // Handle directories
        const dirCmd = `mkdir -p /workspace/${relativePath}`;
        console.log(`Creating directory in container ${replId}: ${dirCmd}`);
        await execCommandInContainer(container, dirCmd);
        console.log(`Finished directory command: ${dirCmd}`);
      } else {
        // Handle files
        const s3FileData = await s3
          .getObject({
            Bucket: s3Params.Bucket,
            Key: fileKey,
          })
          .promise();

        const fileDataBase64 = s3FileData.Body.toString("base64");
        const fileCmd = `echo "${fileDataBase64}" | base64 -d > /workspace/${relativePath}`;
        console.log(
          `Writing file to /workspace/${relativePath} in container ${replId}`
        );
        await execCommandInContainer(container, fileCmd);
        console.log(`Finished file command: ${fileCmd}`);
      }

      // Break out of the loop if this is the last file
      if (index === s3Data.Contents.length - 1) {
        console.log("All files processed, breaking out of loop");
        break;
      }
    }

    console.log("Finished processing all files");
    // Send success response once, after the loop finishes
    res.status(201).json({
      status: "success",
      message: `Container ${replId} created and started with /workspace populated from S3.`,
      containerId: container.id,
    });
  } catch (error) {
    console.error("Error creating container or downloading S3 content:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating container or downloading S3 content",
      error: error.message,
    });
  }
});

app.listen(3003, () => console.log("Orchestrator is listening on port 3003"));
