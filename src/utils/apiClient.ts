import fetch from 'node-fetch';
import config from '../config/testConfig';

export async function apiGet(path: string, token?: string) {
  const res = await fetch(`${config.apiBase}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.json();
}
