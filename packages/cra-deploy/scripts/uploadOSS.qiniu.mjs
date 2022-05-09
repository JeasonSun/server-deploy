// https://developer.qiniu.com/kodo/sdk/nodejs#5

import { createReadStream, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

import qiniu from "qiniu";
import readdirp from "readdirp";
import PQueue from "p-queue";
import dotenv from "dotenv";

/**
 * 配置环境变量
 */
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const NODE_ENV = "production";
const dotenvPath = resolve(__dirname, "../.env");
const dotenvFiles = [
  `${dotenvPath}.${NODE_ENV}.local`,
  NODE_ENV !== "test" && `${dotenvPath}.local`,
  `${dotenvPath}.${NODE_ENV}`,
  dotenvPath,
].filter(Boolean);

dotenvFiles.forEach((dotenvFile) => {
  if (existsSync(dotenvFile)) {
    dotenv.config({
      path: dotenvFile,
    });
  }
});

const accessKey = process.env.ACCESS_KEY_ID;
const secretKey = process.env.ACCESS_KEY_SECRET;
const bucket = process.env.OSS_BUCKET;

if(!accessKey || !secretKey || !bucket){
  console.log('上传qiniu配置不正确，请检查');
  process.exitCode = 1;
}

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

const queue = new PQueue({
  concurrency: 10,
});
/**
 * 判断文件（Object）是否在OSS中存在
 * 对于带有 hash 的文件而言，如果存在该文件名，则在 OSS 中存在
 * 对于不带有 hash 的文件而言，可以对该 Object 设置一个 X-OSS-META-MTIME 或者 X-OSS-META-HASH 每次对比来判断该文件是否存在更改，本函数跳过
 * 如果再严谨点，将会继续对比 header 之类
 */
// async function isExistObject(objectName) {
//   try {
//     await client.head(objectName);
//     return true;
//   } catch (error) {
//     return false;
//   }
// }

/**
 * objectName: static/css/main.23d34s2.css
 * withHash: 该文件是否携带 hash 值
 */
async function uploadFile(objectName, overWrite = false) {
  const file = resolve("./build", objectName);
  // 如果路径名称不带有 hash 值，则直接判断在 OSS 中不存在该文件名，需要重新上传
  // const exist = withHash ? await isExistObject(objectName) : false;

  // if (!exist) {
  // const cacheControl = withHash ? "max-age=31536000" : "no-cache";
  // 为了加速传输速度， 这里使用 stream

  try {
    await uploadPromise(objectName, file, overWrite);
    console.log(`Done: ${objectName}`);
  } catch (error) {
    console.log(`Error`, error, objectName);
  }
  // } else {
  // 如果该文件在 OSS 已经存在，则跳过该文件 (Object);
  // console.log(`Skip: ${objectName}`);
  // }
}
async function uploadPromise(fileName, file, overWrite) {
  // formUploader.putStream(objectName, createReadStream(file), {
  //   headers: {
  //     "Cache-Control": cacheControl,
  //   },
  // });

  // 七牛中不能通过SDK修改资源的Cache-Control，只能在CDN域名配置中修改自定义配置。
  // https://developer.qiniu.com/fusion/4944/cache-configuration

  const options = {
    scope: overWrite ? `${bucket}:${fileName}` : bucket,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  const config = new qiniu.conf.Config();
  const formUploader = new qiniu.form_up.FormUploader(config);
  const uploadToken = putPolicy.uploadToken(mac);
  const putExtra = new qiniu.form_up.PutExtra();
  const readableStream = createReadStream(file);

  return new Promise((resolve, reject) => {
    formUploader.putStream(
      uploadToken,
      fileName,
      readableStream,
      putExtra,
      function (respErr, respBody, respInfo) {
        if (respErr) {
          const errorMessage = respErr && respErr.message;
          const errorArr = errorMessage.split("\n");
          return reject({
            code: errorArr[0] || "500",
            data: errorArr[1] || "未知错误",
          });
        }
        if (respInfo.statusCode === 200) {
          return resolve(respBody);
        } else {
          return reject({
            code: respInfo.statusCode,
            data: respBody,
          });
        }
      }
    );
  });
}

async function main() {
  // 首先上传不带 hash 的文件
  for await (const entry of readdirp("./build", { depth: 0, type: "files" })) {
    queue.add(() => uploadFile(entry.path, true));
  }

  // 上传携带 hash 的文件
  for await (const entry of readdirp("./build/static", { type: "files" })) {
    queue.add(() => uploadFile(`static/${entry.path}`, false));
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
