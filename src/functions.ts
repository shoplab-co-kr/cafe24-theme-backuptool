import {
  CAFE24_ID,
  CAFE24_PSWD,
  CAFE24_EC_LOGIN_URL,
  TARGET_SKINS,
  TIMESTAMP,
  BROWSER_USER_AGENT,
  DEFAULT_WAIT_OPTIONS,
} from "./constants";

export {
  CAFE24_ID,
  CAFE24_PSWD,
  CAFE24_EC_LOGIN_URL,
  TARGET_SKINS,
  TIMESTAMP,
  BROWSER_USER_AGENT,
  DEFAULT_WAIT_OPTIONS,
};

import puppeter from "puppeteer";
import path from "path";
import mkdirp from "mkdirp";

// 스킨 디렉토리의 모든 폴더를 클릭하여 파일을 클릭할 수 있는 상태로 만드는 함수
export const openDirectory = async (_page: puppeter.Page) => {
  process.stdout.write("start open directorys...");
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
  process.stdout.write("done\n");
};

// 스마트디자인의 특정 파일 url로 접속하는 함수
export const goToFile = async (
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
export const clickToFile = async (
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
          let suspend = true;
          await goToFile(_page, _skin, _url);
          await openDirectory(_page).then(() => {
            suspend = false;
          });
          while (suspend);
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
export const makeDir = async (
  _skin: { name: string; url: string },
  _url: string
) => {
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
