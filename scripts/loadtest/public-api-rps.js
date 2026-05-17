import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const targetPath = __ENV.TARGET_PATH || '/api/public/works?page=1&pageSize=12';
const rate = Number.parseInt(__ENV.RATE || '120', 10);
const durationSeconds = Number.parseInt(__ENV.DURATION_SECONDS || '120', 10);
const maxVus = Number.parseInt(__ENV.MAX_VUS || '1000', 10);

export const options = {
  scenarios: {
    public_api_rps: {
      executor: 'constant-arrival-rate',
      rate,
      timeUnit: '1s',
      duration: `${durationSeconds}s`,
      preAllocatedVUs: Math.min(200, maxVus),
      maxVUs: maxVus,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function publicApiRps() {
  const url = `${baseUrl}${targetPath}${targetPath.includes('?') ? '&' : '?'}__k6Vu=${__VU}&__k6Iter=${__ITER}`;
  const response = http.get(url, { tags: { scenario: 'public-api-rps' } });
  check(response, {
    'status is < 500': (r) => r.status < 500,
  });
}
