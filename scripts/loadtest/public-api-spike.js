import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const targetPath = __ENV.TARGET_PATH || '/api/public/works?page=1&pageSize=12';
const warmupRate = Number.parseInt(__ENV.WARMUP_RATE || '50', 10);
const spikeRate = Number.parseInt(__ENV.SPIKE_RATE || '500', 10);
const durationSeconds = Number.parseInt(__ENV.DURATION_SECONDS || '180', 10);
const maxVus = Number.parseInt(__ENV.MAX_VUS || '2000', 10);

export const options = {
  scenarios: {
    public_api_spike: {
      executor: 'ramping-arrival-rate',
      startRate: warmupRate,
      timeUnit: '1s',
      preAllocatedVUs: Math.min(200, maxVus),
      maxVUs: maxVus,
      stages: [
        { duration: `${Math.max(10, Math.floor(durationSeconds * 0.3))}s`, target: warmupRate },
        { duration: `${Math.max(10, Math.floor(durationSeconds * 0.2))}s`, target: spikeRate },
        { duration: `${Math.max(10, Math.floor(durationSeconds * 0.2))}s`, target: spikeRate },
        { duration: `${Math.max(10, Math.floor(durationSeconds * 0.3))}s`, target: warmupRate },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1200'],
  },
};

export default function publicApiSpike() {
  const url = `${baseUrl}${targetPath}${targetPath.includes('?') ? '&' : '?'}__k6Vu=${__VU}&__k6Iter=${__ITER}`;
  const response = http.get(url, { tags: { scenario: 'public-api-spike' } });
  check(response, {
    'status is < 500': (r) => r.status < 500,
  });
}
