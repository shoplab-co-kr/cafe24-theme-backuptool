import {
  CAFE24_ID,
  CAFE24_PSWD,
  CAFE24_EC_LOGIN_URL,
  TARGET_SKINS,
  TIMESTAMP,
  BROWSER_USER_AGENT,
  DEFAULT_WAIT_OPTIONS,
  openDirectory,
  clickToFile,
  makeDir,
} from "./functions";

import puppeter from "puppeteer";
import path from "path";
import fs from "fs";
import http from "http";

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
    for (const _skin of TARGET_SKINS) {
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
          const filesNum = urls.html.length + urls.etc.length;
          let crawledFilesNum = 0;

          for (const url of urls.html) {
            await clickToFile(page, _skin, url);
            const dir = await makeDir(_skin, url);

            // Cafe24 스마트디자인 내장 CodeMirro의 getValue()를 호출 및 코드텍스트 저장
            crawledFilesNum += 1;
            process.stdout.write(
              `[${((crawledFilesNum / filesNum) * 100).toFixed(
                2
              )}%] crawling file: ${url}...`
            );
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
                crawledFilesNum += 1;
                console.log(
                  `[${((crawledFilesNum / filesNum) * 100).toFixed(
                    2
                  )}%] crawling file: ${url}...done`
                );
                if (crawledFilesNum == filesNum) {
                  console.log(`Done crawling: ${_skin["url"]}\n`);
                }
              });
            });
          }
        });
    }
    await browser.close();
  } else {
    await browser.close();
    throw new Error("CAFE24 EC login failed.");
  }
})();
