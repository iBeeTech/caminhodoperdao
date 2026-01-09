export class HttpError extends Error {
  public readonly status: number;
  public readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(input: RequestInfo | URL, init: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  const isNoContent = response.status === 204;
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  let data: unknown;

  if (!isNoContent) {
    try {
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (error) {
      data = undefined;
    }
  }

  if (!response.ok) {
    const message = (data as { message?: string } | undefined)?.message ?? response.statusText;
    throw new HttpError(response.status, message, data);
  }

  return data as T;
}

const API_BASE_URL = "https://caminhodoperdao.pages.dev";

const getFullUrl = (url: string): string => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
};

export const httpClient = {
  get<T>(url: string, init?: RequestInit) {
    return request<T>(getFullUrl(url), { method: "GET", ...init });
  },
  post<T>(url: string, body?: unknown, init?: RequestInit) {
    const headers = {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    };

    return request<T>(getFullUrl(url), {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...init,
    });
  },
};
