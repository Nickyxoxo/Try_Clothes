const API_BASE_URL = "/api/tryon";

interface TryOnRequest {
  personImageUrl?: string;
  clothingImageUrl?: string;
  personBase64?: string;
  clothingBase64?: string;
}

interface TryOnResponse {
  url: string;
  size: string;
}

function log(level: "info" | "warn" | "error", message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = "[TryOn]";
  
  if (level === "error") {
    console.error(`${prefix} ${timestamp} ERROR:`, message, data ?? "");
  } else if (level === "warn") {
    console.warn(`${prefix} ${timestamp} WARN:`, message, data ?? "");
  } else {
    console.log(`${prefix} ${timestamp} INFO:`, message, data ?? "");
  }
}

export async function generateTryOnImage(
  request: TryOnRequest,
  timeout: number = 120000
): Promise<TryOnResponse> {
  log("info", "开始生成虚拟试穿图像", request);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    log("info", "API 响应状态", {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorMsg = data.error || `HTTP 错误: ${response.status}`;
      log("error", "API 返回错误", errorMsg);
      throw new Error(errorMsg);
    }

    log("info", "生成成功", {
      resultUrl: data.url,
      size: data.size,
    });

    return {
      url: data.url,
      size: data.size,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        log("error", "请求超时");
        throw new Error(`请求超时 (${timeout / 1000}秒)`);
      }
      log("error", "生成失败", error.message);
      throw error;
    }

    log("error", "未知错误", error);
    throw new Error("未知错误，请查看日志");
  }
}

export type { TryOnRequest, TryOnResponse };