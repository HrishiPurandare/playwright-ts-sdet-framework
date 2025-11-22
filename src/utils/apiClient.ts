import fetch from 'node-fetch';
import config from '../config/testConfig';

async function apiRequest(method: string, path: string, body?: any) {
  const url = `${config.apiBase}${path}`;
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { status: res.status, text };
  }
}

export async function apiGet(path: string) {
  return apiRequest('GET', path);
}

export async function apiPost(path: string, payload: any) {
  return apiRequest('POST', path, payload);
}
