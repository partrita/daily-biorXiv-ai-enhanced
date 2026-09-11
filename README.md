# 🚀 daily-arXiv-ai-enhanced

> [!CAUTION]
> 귀하가 속한 사법 관할권에서 학술 데이터에 대한 검열 요건이 있는 경우 본 코드를 주의하여 실행하십시오. 2차 배포 버전은 규정 준수 검토(원문 논문 규정 준수 및 AI 규정 준수 포함하되 이에 국한되지 않음) 의무를 이행해야 하며, 그렇지 않을 경우 모든 법적 결과는 다운스트림 사용자가 직접 부담합니다.

> [!CAUTION]
> If your jurisdiction has censorship requirements for academic data, run this code with caution; any secondary distribution version must remove the entrance accessible to China and fulfill the content review obligations, otherwise all legal consequences will be borne by the downstream.


This innovative tool transforms how you stay updated with arXiv papers by combining automated crawling with AI-powered summarization.


## ✨ Key Features

🎯 **Zero Infrastructure Required**
- Leverages GitHub Actions and Pages - no server needed
- Completely free to deploy and use

🤖 **Smart AI Summarization**
- Daily paper crawling with DeepSeek-powered summaries
- Cost-effective: Only ~0.2 CNY per day

💫 **Smart Reading Experience**
- Personalized paper highlighting based on your interests
- Cross-device compatibility (desktop & mobile)
- Local preference storage for privacy
- Flexible date range filtering

🧩 **SKILL System**
- Plug-and-play skill modules for customizing paper filtering

⚙️ **Easy Preference Export & Integration**
- One-click copy in Settings to export your keywords and authors configuration
- Seamlessly combine exported preferences with SKILL for reproducible and shareable setups

👉 **[Try it now!](https://dw-dengwei.github.io/daily-arXiv-ai-enhanced/)** - No installation required



https://github.com/user-attachments/assets/b25712a4-fb8d-484f-863d-e8da6922f9d7




# How to use / 사용 가이드

이 저장소를 **Fork(포크)**하여 자신만의 맞춤형 논문 수집 및 AI 요약 웹사이트를 무료로 운영할 수 있습니다.

---

## 🛠️ 포크 후 설정 가이드 (Setup Guide)

### 1단계: 저장소 포크 (Fork)
1. 우측 상단의 **Fork** 버튼을 눌러 내 GitHub 계정으로 저장소를 복제합니다.

---

### 2단계: GitHub Variables 설정 (⭐ 중요: 검색 키워드 및 환경 설정)
저장소 상단 **Settings ➡️ Secrets and variables ➡️ Actions ➡️ Variables 탭**으로 이동하여 **`New repository variable`** 버튼을 눌러 아래 변수들을 등록합니다:

| 변수명 (Variable Name) | 필수 여부 | 설명 및 예시 |
| :--- | :---: | :--- |
| **`CATEGORIES`** | **필수** | **수집할 검색 키워드 목록 (쉼표 `,`로 구분)**<br>• 예시: `de novo design, antibody design, protein design`<br>• 따옴표 없이 입력하며, 각 키워드별 bioRxiv 최신 논문이 수집됩니다. |
| **`LANGUAGE`** | **필수** | **AI 요약 언어**<br>• 기본값: `Korean` (또는 `English` 등) |
| **`MODEL_NAME`** | **필수** | **사용할 LLM 모델명**<br>• 예시: `gemini-2.5-flash` (또는 `deepseek-chat`, `gpt-4o-mini`) |
| **`EMAIL`** | **필수** | **GitHub Actions 커밋용 이메일** (예: `your-email@example.com`) |
| **`NAME`** | **필수** | **GitHub Actions 커밋용 이름** (예: `your-github-username`) |

---

### 3단계: GitHub Secrets 설정 (API 키)
**Settings ➡️ Secrets and variables ➡️ Actions ➡️ Secrets 탭**으로 이동하여 **`New repository secret`**을 등록합니다:

| 시크릿명 (Secret Name) | 필수 여부 | 설명 |
| :--- | :---: | :--- |
| **`OPENAI_API_KEY`** | **필수** | LLM API 키 (Gemini 또는 OpenAI / DeepSeek API 키) |
| **`OPENAI_BASE_URL`** | **선택** | OpenAI 호환 엔드포인트 URL (기본값: `https://api.openai.com/v1`, Gemini/DeepSeek 호환 URL 사용 시 설정) |
| **`ACCESS_PASSWORD`** | **선택** | 웹페이지 비밀번호 보호 기능 (비워두면 누구나 접근 가능) |

---

### 4단계: GitHub Pages 활성화
1. 저장소 상단의 **Settings ➡️ Pages**로 이동합니다.
2. **Build and deployment** 섹션의 **Source** 드롭다운에서 **`GitHub Actions`**를 선택합니다.

---

### 5단계: 첫 실행 (Run Workflow)
1. 저장소 상단의 **Actions 탭 ➡️ `arXiv-daily-ai-enhanced`**를 클릭합니다.
2. 우측의 **Run workflow** 드롭다운을 열고 버튼을 누릅니다.
3. 워크플로우가 완료되면 `https://<username>.github.io/daily-arXiv-ai-enhanced/`에서 나만의 논문 큐레이션 웹페이지를 확인할 수 있습니다. (이후 매일 지정된 시간에 자동 실행됩니다)

# Contributors
Thanks to the following special contributors for contributing code, discovering bugs, and sharing useful ideas for this project!!!
If you find that I missed your contribution below, please feel free to contact me through email.
<table>
  <tbody>
    <tr>
      <td align="center" valign="top">
        <a href="https://github.com/JianGuanTHU"><img src="https://avatars.githubusercontent.com/u/44895708?v=4" width="100px;" alt="JianGuanTHU"/><br /><sub><b>JianGuanTHU</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://github.com/Chi-hong22"><img src="https://avatars.githubusercontent.com/u/75403952?v=4" width="100px;" alt="Chi-hong22"/><br /><sub><b>Chi-hong22</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://github.com/chaozg"><img src="https://avatars.githubusercontent.com/u/69794131?v=4" width="100px;" alt="chaozg"/><br /><sub><b>chaozg</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://github.com/quantum-ctrl"><img src="https://avatars.githubusercontent.com/u/16505311?v=4" width="100px;" alt="quantum-ctrl"/><br /><sub><b>quantum-ctrl</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://github.com/Zhao2z"><img src="https://avatars.githubusercontent.com/u/141019403?v=4" width="100px;" alt="Zhao2z"/><br /><sub><b>Zhao2z</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://github.com/eclipse0922"><img src="https://avatars.githubusercontent.com/u/6214316?v=4" width="100px;" alt="eclipse0922"/><br /><sub><b>eclipse0922</b></sub></a><br />
      </td>
    </tr>


  </tbody>
  <tbody>
   <tr>
      <td align="center" valign="top">
        <a href="https://github.com/xuemian168"><img src="https://avatars.githubusercontent.com/u/38741078?v=4" width="100px;" alt="xuemian168"/><br /><sub><b>xuemian168</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://github.com/Lrrrr549"><img src="https://avatars.githubusercontent.com/u/71866027?v=4" width="100px;" alt="Lrrrr549"/><br /><sub><b>Lrrrr549</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://github.com/AinzRimuru"><img src="https://avatars.githubusercontent.com/u/59441476?v=4" width="100px;" alt="AinzRimuru"/><br /><sub><b>AinzRimuru</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://github.com/fengxueguiren"><img src="https://avatars.githubusercontent.com/u/153522370?v=4" width="100px;" alt="fengxueguiren"/><br /><sub><b>fengxueguiren</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://github.com/zerocpp"><img src="https://avatars.githubusercontent.com/u/2630297?v=4" width="100px;" alt="fengxueguiren"/><br /><sub><b>zerocpp</b></sub></a><br />
      </td>
   </tr>
  </tbody>
</table>

# Acknowledgement
We sincerely thank the following individuals and organizations for their promotion and support!!!
<table>
  <tbody>
    <tr>
      <td align="center" valign="top">
        <a href="https://x.com/GitHub_Daily/status/1930610556731318781"><img src="https://pbs.twimg.com/profile_images/1660876795347111937/EIo6fIr4_400x400.jpg" width="100px;" alt="Github_Daily"/><br /><sub><b>Github_Daily</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://x.com/aigclink/status/1930897858963853746"><img src="https://pbs.twimg.com/profile_images/1729450995850027008/gllXr6bh_400x400.jpg" width="100px;" alt="AIGCLINK"/><br /><sub><b>AIGCLINK</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://www.ruanyifeng.com/blog/2025/06/weekly-issue-353.html"><img src="https://avatars.githubusercontent.com/u/905434" width="100px;" alt="루안이펑의 기술 주간지"/><br /><sub><b>루안이펑의 웹로그 <br> 기술 애호가 주간지 <br> (제353호)</b></sub></a><br />
      </td>
      <td align="center" valign="top">
        <a href="https://hellogithub.com/periodical/volume/111"><img src="https://github.com/user-attachments/assets/eff6b6dd-0323-40c4-9db6-444a51bbc80a" width="100px;" alt="《HelloGitHub》 제111호"/><br /><sub><b>《HelloGitHub》<br> 월간 제111호</b></sub></a><br />
      </td>
    </tr>
  </tbody>
</table>


# Star history

[![Stargazers over time](https://starchart.cc/dw-dengwei/daily-arXiv-ai-enhanced.svg?variant=adaptive)](https://starchart.cc/dw-dengwei/daily-arXiv-ai-enhanced)

# Buy me a coffee
[here](./buy-me-a-coffee/README.md)
