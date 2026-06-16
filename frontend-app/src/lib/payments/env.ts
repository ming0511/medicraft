import { env } from '$env/dynamic/public';

// 클라이언트 키(브라우저 노출 OK). 시크릿 키는 서버 전용($lib/server/payments.ts)에서만 읽음.
export const TOSS_CLIENT_KEY = env.PUBLIC_TOSS_CLIENT_KEY ?? '';
export const PAYMENTS_ENABLED = Boolean(TOSS_CLIENT_KEY);
