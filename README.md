# Cafe24 Theme Crawler

## installation

본 프로젝트는 Puppeteer를 의존성으로 가지고 있기 때문에 M1 환경에서 구동하려면 ARM 버전 Chromium을 설치해야한다.

```
brew install chromium --no-quarantine
```

설치 후 rc파일(~/.zshrc or ~/.bash_profile)에 아래 환경변수를 설정해준다

```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=`which chromium`
```

그 후, 본 프로젝트의 NPM 의존성 패키지를 설치

```
npm install
```
