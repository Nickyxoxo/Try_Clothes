import type { NextApiRequest, NextApiResponse } from "next";
import COS from "cos-nodejs-sdk-v5";

type ResponseData = {
  url: string;
} | {
  error: string;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

function getCOS() {
  return new COS({
    SecretId: process.env.TENCENT_COS_SECRET_ID,
    SecretKey: process.env.TENCENT_COS_SECRET_KEY,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { imageBase64 } = req.body;

  if (!imageBase64) {
    res.status(400).json({ error: "Missing image data" });
    return;
  }

  const bucket = process.env.TENCENT_COS_BUCKET;
  const region = process.env.TENCENT_COS_REGION;

  if (!bucket || !region) {
    res.status(500).json({ error: "COS 配置不完整" });
    return;
  }

  try {
    console.log("[COS] 正在上传图片...");
    
    // 提取 pure base64
    const base64Data = imageBase64.includes(",") 
      ? imageBase64.split(",")[1] 
      : imageBase64;
    
    // 解码 base64
    const buffer = Buffer.from(base64Data, "base64");
    
    // 生成唯一文件名
    const fileName = `tryon/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
    
    // 上传到 COS
    const cos = getCOS();
    
    const result = await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: bucket,
        Region: region,
        Key: fileName,
        Body: buffer,
        ContentType: "image/png",
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data as unknown as { Location: string; url: string });
      });
    });
    
    // 构建访问 URL
    const imageUrl = `https://${bucket}.cos.${region}.myqcloud.com/${fileName}`;
    
    console.log("[COS] 上传成功:", imageUrl);
    
    res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error("[COS] 上传失败:", error);
    res.status(500).json({ error: "上传失败，请重试" });
  }
}