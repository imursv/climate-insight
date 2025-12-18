// API 설정
// GitHub Raw URL 또는 로컬 서버 URL 사용

const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || "imursv";
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "climate-insight";
const GITHUB_BRANCH = process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main";

// GitHub Raw URL base
export const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/data`;

// 로컬 개발 시 사용할 API base (BE 서버 또는 public 폴더)
export const LOCAL_API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/data";

// 현재 환경에 따라 API base 결정
export const API_BASE = process.env.NODE_ENV === "production"
  ? GITHUB_RAW_BASE
  : LOCAL_API_BASE;

// Fetch 옵션
export const fetchOptions: RequestInit = {
  next: {
    revalidate: 3600, // 1시간마다 재검증 (ISR)
  },
};
