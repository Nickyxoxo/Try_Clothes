import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export const categoryLabels: Record<string, string> = {
  top: "上衣",
  bottom: "下装",
  skirt: "裙子",
};

export const typeLabels: Record<string, string> = {
  full: "全身",
  upper: "上半身",
  invalid: "不可用",
};

export const errorMessages = {
  typeMismatch: "当前照片无法试穿该服装，请上传更完整的人物照片",
  invalidPhoto: "无法识别照片中的人物，请上传更清晰的照片",
  uploadFailed: "上传失败，请重试",
  generateFailed: "生成失败，请重试",
};

export const validationRules = {
  upper: {
    top: true,
    bottom: false,
    skirt: false,
  },
  full: {
    top: true,
    bottom: true,
    skirt: true,
  },
  invalid: {
    top: false,
    bottom: false,
    skirt: false,
  },
};

export function validateClothingMatch(
  personType: string,
  clothingCategory: string
): boolean {
  const rules = validationRules as Record<string, Record<string, boolean>>;
  if (!rules[personType]) return false;
  return rules[personType][clothingCategory] ?? false;
}

export const exampleClothes: Array<{ id: string; url: string; category: string }> = [
  { id: "example-1", url: "/images/clothing-1.png", category: "top" },
  { id: "example-2", url: "/images/clothing-2.png", category: "bottom" },
  { id: "example-3", url: "/images/clothing-3.png", category: "skirt" },
];