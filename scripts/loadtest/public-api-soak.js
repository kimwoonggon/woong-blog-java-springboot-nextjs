import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const targetPath = __ENV.TARGET_PATH || '/api/public/blogs?page=1&pageSize=12';
const vus = Number.parseInt(__ENV.VUS || '100', 10);
const durationSeconds = Number.parseInt(__ENV.DURATION_SECONDS || '900', 10);

export const options = {
  scenarios: {
    public_api_soak: {
      executor: 'constant-vus',
      vus,
      duration: `${durationSeconds}s`,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function publicApiSoak() {
  const url = `${baseUrl}${targetPath}${targetPath.includes('?') ? '&' : '?'}__k6Vu=${__VU}&__k6Iter=${__ITER}`;
  const response = http.get(url, { tags: { scenario: 'public-api-soak' } });
  check(response, {
    'status is < 500': (r) => r.status < 500,
  });
  sleep(1);
}
