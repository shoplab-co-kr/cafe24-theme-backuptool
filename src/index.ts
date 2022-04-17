import puppeter, { Dialog } from "puppeteer";
import $ from "cheerio";
import dotenv from "dotenv";
import path from "path";
import mkdirp from "mkdirp";
import fs from "fs";
import http from "http";

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
const TARGET_SKIN = process.env.SKIN_ID.split(",").map((x) => {
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

// 스킨 디렉토리의 모든 폴더를 클릭하여 파일을 클릭할 수 있는 상태로 만드는 함수
const openDirectory = async (_page: puppeter.Page) => {
  await _page.waitForSelector("#aside > ul > li.all");
  await _page.click("#aside > ul > li.all");
  await _page.waitForSelector(
    "#snbAll > ul > li > ul li.folder:not(.selected)"
  );
  while (
    (await _page.$$("#snbAll > ul > li > ul li.folder:not(.selected)"))
      .length != 0
  ) {
    await _page.$$eval(
      "#snbAll > ul > li > ul li.folder:not(.selected) > a",
      (elHandles) => elHandles.forEach((el: any) => el.click())
    );
  }
};

// 스마트디자인의 특정 파일 url로 접속하는 함수
const goToFile = async (
  _page: puppeter.Page,
  _skin: { name: string; url: string },
  _url: string
) => {
  await _page.goto(
    `http://${
      _skin["name"]
    }.${CAFE24_ID}.cafe24.com/disp/admin/editor/main?editorFile=${
      _url.split(".com")[1]
    }`,
    DEFAULT_WAIT_OPTIONS
  );
};

// 스마트디자인 좌측 디렉토리 내 파일을 클릭하여 접속하는 함수
const clickToFile = async (
  _page: puppeter.Page,
  _skin: { name: string; url: string },
  _url: string
) => {
  const _href = _url.split(".com")[1];
  await _page
    .evaluate(() => {
      const eles = document.querySelectorAll(
        ".CodeMirror-code > div:first-child .CodeMirror-linenumber.CodeMirror-gutter-elt"
      );
      for (const ele of eles) {
        ele.remove();
      }
    })
    .then(async () => {
      const originURL = _page.url();
      await _page.waitForSelector(
        `#snbAll > ul > li > ul li.file a[href="${_href}"]`
      );
      await _page.click(`#snbAll > ul > li > ul li.file a[href="${_href}"]`);

      const timer = setInterval(async () => {
        if (_page.url() != originURL) {
          await goToFile(_page, _skin, _url);
          await openDirectory(_page);
        } else
          await _page.click(
            `#snbAll > ul > li > ul li.file a[href="${_href}"]`
          );
      }, 1000);
      await _page.waitForSelector(
        ".CodeMirror-code > div:first-child .CodeMirror-linenumber.CodeMirror-gutter-elt"
      );
      clearInterval(timer);
    });
};

// url을 받아 저장 디렉토리를 생성 및 리턴하는 함수
const makeDir = async (_skin: { name: string; url: string }, _url: string) => {
  const dir = _url.split(".com/")[1].split("/");
  const fileName = dir.pop() as string;
  dir.unshift(TIMESTAMP);
  dir.unshift(_skin["name"]);
  dir.unshift(CAFE24_ID);
  dir.unshift("skins");
  dir.unshift("..");
  dir.unshift(__dirname);

  await mkdirp(path.join.apply(null, dir));
  dir.push(fileName);

  return dir;
};

// 메인 루프
(async () => {
  console.log(`puppeteer start: ${TIMESTAMP}`);

  const browser = await puppeter.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.setUserAgent(BROWSER_USER_AGENT);
  await page.on("dialog", async (dialog) => {
    await dialog.dismiss();
    await page.keyboard.press("Escape");
  });

  // Cafe24 EC 관리자 페이지 로그인 시도
  await page.goto(CAFE24_EC_LOGIN_URL);
  await page.waitForSelector("#mall_id");
  await page.type("#mall_id", CAFE24_ID);
  await page.waitForSelector("#userpasswd");
  await page.type("#userpasswd", CAFE24_PSWD);
  await page.waitForSelector("#frm_user > div > div.mButton > button");
  await Promise.all([
    page.click("#frm_user > div > div.mButton > button"),
    page.waitForNavigation(DEFAULT_WAIT_OPTIONS),
  ]);

  // Cafe24 EC 관리자 페이지 로그인 성공 여부 검사
  if (
    page.url() ===
    `https://${CAFE24_ID}.cafe24.com/disp/admin/shop1/mode/dashboard?`
  ) {
    console.log("CAFE24 EC login successed.");

    // 스킨별 에디터 페이지 접속 및 크롤링 시작
    for (const _skin of TARGET_SKIN) {
      // 스킨 에디터 페이지 접속 성공 여부 검사
      const res = await page.goto(_skin["url"]);
      if (res["_status"] !== 200) {
        console.error(`Cannot access URL: ${_skin["url"]}`);
        continue;
      }
      console.log(`Success access URL: ${_skin["url"]}`);

      await openDirectory(page);

      // 크롤링할 모든 파일의 경로를 추출
      await page
        .$$eval("#snbAll > ul > li > ul li.file > a", (eleHanles) => {
          const urls = {
            html: [] as string[],
            etc: [] as string[],
          };
          eleHanles.forEach((el: any) => {
            const tmp = el.href.split(".");
            if (tmp[tmp.length - 1] === "html") urls.html.push(el.href);
            else urls.etc.push(el.href);
          });
          return urls;
        })
        .then(async (urls) => {
          // 크롤링 시작
          for (const url of urls.html) {
            await clickToFile(page, _skin, url);
            const dir = await makeDir(_skin, url);

            // Cafe24 스마트디자인 내장 CodeMirro의 getValue()를 호출 및 코드텍스트 저장
            process.stdout.write(`crawling file: ${url}...`);
            await page.waitForSelector(".CodeMirror-line");
            const code = await page.evaluate("SDE.editor.getValue()");
            await fs.writeFile(path.join.apply(null, dir), code, (err) => {
              if (err) {
                console.log(err);
                process.stdout.write("fail\n");
              } else process.stdout.write("done\n");
            });
          }
          for (const url of urls.etc) {
            const dir = await makeDir(_skin, url);

            // HTML 파일 외의 기타 파일들은 URL로 직접 GET 요청을 보내어 다운로드
            const file = fs.createWriteStream(path.join.apply(null, dir));
            http.get(url, (res) => {
              res.pipe(file);
              file.on("finish", () => {
                file.close();
                console.log(`crawling file: ${url}...done`);
              });
            });
          }
        });
      console.log(`Done crawling: ${_skin["url"]}`);
    }
    await browser.close();
  } else {
    await browser.close();
    throw new Error("CAFE24 EC login failed.");
  }
})();
