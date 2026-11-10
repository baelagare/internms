export const TOKEN_KEY = 'internms_laravel_token';
export function createLaravelAuth({ baseUrl, storage, fetcher = fetch, onUnauthorized = () => {} }) {
  async function request(path, method = 'GET', body) {
    const token = storage.getItem(TOKEN_KEY);
    let response;
    try { response = await fetcher(`${baseUrl.replace(/\/$/, '')}/api/v1/auth/${path}`, { method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch { throw new Error('Cannot reach Laravel authentication. Check the API base URL and backend availability.'); }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) { storage.removeItem(TOKEN_KEY); onUnauthorized(); }
      const details = Object.values(payload.errors || {}).flat().join(' ');
      const error = new Error(details || payload.message || `Authentication request failed (${response.status}).`);
      error.status = response.status; error.fields = payload.errors || {};
      throw error;
    }
    return payload;
  }
  async function establish(path, body) {
    const result = await request(path, 'POST', body);
    if (!result.data?.token || !result.data?.user) throw new Error('Laravel returned an unexpected authentication response.');
    storage.setItem(TOKEN_KEY, result.data.token);
    return result.data.user;
  }
  return {
    login: (identifier, password) => establish('login', { login: identifier, password, device_name: 'InternMS React browser' }),
    register: values => establish('register', { identifier_id: values.id, name: values.name, email: values.email, password: values.password, password_confirmation: values.password_confirmation, role: 'student', college: values.college }),
    async restore() { if (!storage.getItem(TOKEN_KEY)) return null; return (await request('me')).data; },
    async logout() { if (storage.getItem(TOKEN_KEY)) { try { await request('logout', 'POST'); } catch (error) { if (error.status !== 401) throw error; } } storage.removeItem(TOKEN_KEY); }
  };
}