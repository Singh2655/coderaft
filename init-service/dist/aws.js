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
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveToS3 = exports.copyS3Folder = void 0;
const aws_sdk_1 = require("aws-sdk");
const s3 = new aws_sdk_1.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION,
});
const copyS3Folder = (sourcePrefix, destinationPrefix, continuationToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // List all objects in the source folder
        const listParams = {
            Bucket: (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : "",
            Prefix: sourcePrefix,
            ContinuationToken: continuationToken,
        };
        const listedObjects = yield s3.listObjectsV2(listParams).promise();
        if (!listedObjects.Contents || listedObjects.Contents.length === 0)
            return;
        // Copy each object to the new location
        // We're doing it parallely here, using promise.all()
        yield Promise.all(listedObjects.Contents.map((object) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            if (!object.Key)
                return;
            const destinationKey = object.Key.replace(sourcePrefix, destinationPrefix);
            const copyParams = {
                Bucket: (_a = process.env.S3_BUCKET) !== null && _a !== void 0 ? _a : "",
                CopySource: `${process.env.S3_BUCKET}/${object.Key}`,
                Key: destinationKey,
            };
            console.log(copyParams);
            yield s3.copyObject(copyParams).promise();
            console.log(`Copied ${object.Key} to ${destinationKey}`);
        })));
        // Check if the list was truncated and continue copying if necessary
        if (listedObjects.IsTruncated) {
            listParams.ContinuationToken = listedObjects.NextContinuationToken;
            yield (0, exports.copyS3Folder)(sourcePrefix, destinationPrefix, continuationToken);
        }
    }
    catch (error) {
        console.log("error copying s3 folder: ", error);
    }
});
exports.copyS3Folder = copyS3Folder;
const saveToS3 = (key, filePath, content) => __awaiter(void 0, void 0, void 0, function* () {
    const params = {
        Bucket: process.env.S3_BUCKET || "",
        Key: `${key}${filePath}`,
        Body: content,
    };
    yield s3.putObject(params).promise();
});
exports.saveToS3 = saveToS3;
