import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  url: string;
  size: string;
} | {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { personImageUrl, clothingImageUrl, personBase64, clothingBase64 } = req.body;

  const personImage = personBase64 || personImageUrl;
  const clothingImage = clothingBase64 || clothingImageUrl;

  if (!personImage || !clothingImage) {
    res.status(400).json({ error: "Missing required image data" });
    return;
  }

  const API_KEY = process.env.VOLCENGINE_API_KEY;
  const API_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
  const MODEL = "doubao-seedream-4-0-250828";

  if (!API_KEY) {
    console.error("[VolcEngine] API Key 未配置");
    res.status(500).json({ error: "API Key 未配置，请检查环境变量" });
    return;
  }

  try {
    console.log("[VolcEngine] 正在发送请求...");

    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: "将图1的模特服装换为图2的服装，保持模特姿势不变",
        image: [personImage, clothingImage],
        sequential_image_generation: "disabled",
        response_format: "url",
        size: "2K",
        stream: false,
        watermark: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[VolcEngine] API 错误:", data);
      const errorMsg = data.error?.message || data.message || "API call failed";
      res.status(response.status).json({ error: errorMsg });
      return;
    }

    if (!data.data || data.data.length === 0) {
      res.status(500).json({ error: "API 返回结果为空" });
      return;
    }

    console.log("[VolcEngine] 生成成功:", data.data[0].url);

    res.status(200).json({
      url: data.data[0].url,
      size: data.data[0].size,
    });
  } catch (error) {
    console.error("[VolcEngine] 请求失败:", error);
    res.status(500).json({ error: "请求失败，请重试" });
  }
}