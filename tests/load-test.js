import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const response = http.post(
    'http://localhost:5000/api/auth/login',
    JSON.stringify({
      email: 'admin@atlas.cl',
      password: 'Password123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'login devuelve HTTP 200': (result) => result.status === 200,
    'respuesta en menos de 300 ms': (result) => result.timings.duration < 300,
  });
  sleep(1);
}
