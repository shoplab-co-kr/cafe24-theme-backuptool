import puppeter from "puppeteer";
import dotenv from "dotenv";
import path from "path";

// 환경변수 초기화
(() => {
  const result = dotenv.config({
    path: path.join(__dirname, "..", "env", ".env"),
  });
  if (result.parsed == undefined) {
    throw new Error("Cannot loaded environment variables file.");
  }
  if (
    process.env.SKIN_ID === undefined ||
    process.env.CAFE24_ID === undefined ||
    process.env.CAFE24_PSWD === undefined
  ) {
    throw new Error("Invaild environment variables file.");
  }
})();

// 상수 선언
const CAFE24_ID: string = process.env.CAFE24_ID;
const CAFE24_PSWD: string = process.env.CAFE24_PSWD;
const CAFE24_EC_LOGIN_URL = "https://eclogin.cafe24.com/Shop/";
const TARGET_SKINS = process.env.SKIN_ID.split(",").map((x) => {
  return {
    name: x,
    url: `http://${x}.${CAFE24_ID}.cafe24.com/disp/admin/editor/main`,
  };
});
const TIMESTAMP = new Date(+new Date() + 3240 * 10000)
  .toISOString()
  .replace("T", " ")
  .replace(/\..*/, "");

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36";
const DEFAULT_WAIT_OPTIONS: puppeter.WaitForOptions = {
  waitUntil: "networkidle2",
};

export {
  CAFE24_ID,
  CAFE24_PSWD,
  CAFE24_EC_LOGIN_URL,
  TARGET_SKINS,
  TIMESTAMP,
  BROWSER_USER_AGENT,
  DEFAULT_WAIT_OPTIONS,
};
