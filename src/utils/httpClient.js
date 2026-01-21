/**
 * HTTP Client wrapper using native fetch API (ESM).
 *
 * - Returns JSON-friendly values (object/array/null).
 * - Throws HttpError for non-2xx responses with parsed response body when possible.
 */

export class HttpError extends Error {
  constructor(message, status, response, url) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.response = response;
    this.url = url;
  }
}

async function parseJsonFriendly(response) {
  // 204 No Content (and some 205s) have no body.
  if (response.status === 204 || response.status === 205) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // Always return a JSON-friendly value.
    return { raw: text };
  }
}

async function handleResponse(response, url) {
  const data = await parseJsonFriendly(response);

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `HTTP ${response.status}: ${response.statusText}`;
    throw new HttpError(message, response.status, data, url);
  }

  return data;
}

function buildOptions(method, options = {}, data) {
  const { headers = {}, ...rest } = options || {};

  const hasBody = method === "POST" || method === "PUT";
  const mergedHeaders = {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };

  const fetchOptions = {
    ...rest,
    method,
    headers: mergedHeaders,
  };

  if (hasBody) {
    fetchOptions.body = data === undefined ? undefined : JSON.stringify(data);
  }

  return fetchOptions;
}

export async function get(url, options) {
  try {
    const response = await fetch(url, buildOptions("GET", options));
    return await handleResponse(response, url);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(`GET request failed: ${error?.message || String(error)}`, 0, null, url);
  }
}

export async function post(url, data, options) {
  try {
    const response = await fetch(url, buildOptions("POST", options, data));
    return await handleResponse(response, url);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(`POST request failed: ${error?.message || String(error)}`, 0, null, url);
  }
}

export async function put(url, data, options) {
  try {
    const response = await fetch(url, buildOptions("PUT", options, data));
    return await handleResponse(response, url);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(`PUT request failed: ${error?.message || String(error)}`, 0, null, url);
  }
}

export async function del(url, options) {
  try {
    const response = await fetch(url, buildOptions("DELETE", options));
    return await handleResponse(response, url);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      `DELETE request failed: ${error?.message || String(error)}`,
      0,
      null,
      url,
    );
  }
}

// Provide the requested API name.
export { del as delete };

export default {
  get,
  post,
  put,
  delete: del,
  HttpError,
};
