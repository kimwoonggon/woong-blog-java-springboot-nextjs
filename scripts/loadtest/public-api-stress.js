import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const targetPath = __ENV.TARGET_PATH || '/api/public/works?page=1&pageSize=12';
const startVus = Number.parseInt(__ENV.START_VUS || '50', 10);
const maxVus = Number.parseInt(__ENV.MAX_VUS || '1500', 10);
const durationSeconds = Number.parseInt(__ENV.DURATION_SECONDS || '300', 10);

export const options = {
  scenarios: {
    public_api_stress: {
      executor: 'ramping-vus',
      startVUs: startVus,
      stages: [
        { duration: `${Math.max(20, Math.floor(durationSeconds * 0.25))}s`, target: Math.floor(maxVus * 0.4) },
        { duration: `${Math.max(20, Math.floor(durationSeconds * 0.25))}s`, target: Math.floor(maxVus * 0.7) },
        { duration: `${Math.max(20, Math.floor(durationSeconds * 0.25))}s`, target: maxVus },
        { duration: `${Math.max(20, Math.floor(durationSeconds * 0.25))}s`, target: Math.floor(maxVus * 0.3) },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
  },
};

export default function publicApiStress() {
  const url = `${baseUrl}${targetPath}${targetPath.includes('?') ? '&' : '?'}__k6Vu=${__VU}&__k6Iter=${__ITER}`;
  const response = http.get(url, { tags: { scenario: 'public-api-stress' } });
  check(response, {
    'status is < 500': (r) => r.status < 500,
  });
}
