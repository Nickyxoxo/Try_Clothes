"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Image as ImageIcon, RefreshCw, ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import {
  PersonPhoto,
  ClothingItem,
  TryOnResult,
  FlowState,
  ClothingCategory,
  PersonType,
  ComparisonData,
  ValidationResult,
} from "@/lib/types";
import {
  generateId,
  categoryLabels,
  typeLabels,
  validateClothingMatch,
  errorMessages,
} from "@/lib/utils";
import { generateTryOnImage } from "@/lib/api";
import Image from "next/image";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// 将 File 转换为 Base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 上传图片到图床
async function uploadImage(imageBase64: string, timeout: number = 30000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Upload failed");
  }

  return data.url;
}

export default function Home() {
  const [flowState, setFlowState] = useState<FlowState>("initial");
  const [personPhotos, setPersonPhotos] = useState<PersonPhoto[]>([]);
  const [clothingItem, setClothingItem] = useState<ClothingItem | null>(null);
  const [results, setResults] = useState<TryOnResult[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    valid: true,
    blockedPhotos: [],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const personInputRef = useRef<HTMLInputElement>(null);
  const clothingInputRef = useRef<HTMLInputElement>(null);

  const handlePersonUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newPhotos: PersonPhoto[] = [];
      Array.from(files).forEach((file) => {
        const url = URL.createObjectURL(file);
        newPhotos.push({
          id: generateId(),
          url,
          type: "full",
          file, // 保存原始 File 对象
        });
      });

      setPersonPhotos((prev) => [...prev, ...newPhotos]);

      if (clothingItem) {
        validatePhotos(newPhotos, clothingItem.category);
      }
    },
    [clothingItem]
  );

  const handleClothingUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      const categories: ClothingCategory[] = ["top", "bottom", "skirt"];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];

      const newClothing: ClothingItem = {
        id: generateId(),
        url,
        category: randomCategory,
        file, // 保存原始 File 对象
      };

      setClothingItem(newClothing);

      if (personPhotos.length > 0) {
        validatePhotos(personPhotos, newClothing.category);
      }
    },
    [personPhotos]
  );

  const validatePhotos = (
    photos: PersonPhoto[],
    category: ClothingCategory
  ) => {
    const blocked: string[] = [];
    const updated = photos.map((photo) => {
      const isMatch = validateClothingMatch(photo.type, category);
      if (!isMatch) {
        blocked.push(photo.id);
      }
      return { ...photo, type: isMatch ? photo.type : "invalid" as PersonType };
    });

    if (blocked.length > 0) {
      setValidationResult({
        valid: false,
        message: errorMessages.typeMismatch,
        blockedPhotos: blocked,
      });
    } else {
      setValidationResult({ valid: true, blockedPhotos: [] });
    }

    setPersonPhotos(updated);
  };

  const removePersonPhoto = (id: string) => {
    setPersonPhotos((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (clothingItem && remaining.length > 0) {
        validatePhotos(remaining, clothingItem.category);
      } else {
        setValidationResult({ valid: true, blockedPhotos: [] });
      }
      return remaining;
    });
  };

  const selectExampleClothing = (url: string, category: string) => {
    const newClothing: ClothingItem = {
      id: generateId(),
      url,
      category: category as ClothingCategory,
      isExample: true,
    };

    setClothingItem(newClothing);

    if (personPhotos.length > 0) {
      validatePhotos(personPhotos, newClothing.category);
    }
  };

  const handleGenerate = async () => {
    if (!clothingItem || personPhotos.length === 0) return;
    if (!validationResult.valid) return;

    setIsGenerating(true);
    setFlowState("processing");
    setTotalCount(personPhotos.length);
    setCurrentProgress(0);
    setProcessingIndex(0);
    setResults([]);
    setErrorMessage(null);

    for (let i = 0; i < personPhotos.length; i++) {
      setProcessingIndex(i);

      const personPhoto = personPhotos[i];
      
      try {
        // 转换为 Base64
        const personBase64 = personPhoto.file ? await fileToBase64(personPhoto.file) : undefined;
        const clothingBase64 = clothingItem.file ? await fileToBase64(clothingItem.file) : undefined;
        
        if (!personBase64 || !clothingBase64) {
          throw new Error("图片文件无效");
        }
        
        // 先上传图片到图床获取公开 URL
        setErrorMessage("正在上传图片...");
        const [personUrl, clothingUrl] = await Promise.all([
          uploadImage(personBase64),
          uploadImage(clothingBase64),
        ]);
        
        setErrorMessage("图片已上传，正在生成...");
        
        const apiResult = await generateTryOnImage({
          personImageUrl: personUrl,
          clothingImageUrl: clothingUrl,
        });

        const newResult: TryOnResult = {
          id: generateId(),
          personPhotoId: personPhoto.id,
          resultUrl: apiResult.url,
          status: "completed",
          originalUrl: personPhoto.url,
        };

        setResults((prev) => [...prev, newResult]);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "生成失败";
        setErrorMessage(errorMsg);
        console.error("生成失败:", error);
        
        const failedResult: TryOnResult = {
          id: generateId(),
          personPhotoId: personPhoto.id,
          resultUrl: personPhoto.url,
          status: "failed",
          originalUrl: personPhoto.url,
        };
        setResults((prev) => [...prev, failedResult]);
      }

      setCurrentProgress(i + 1);
    }

    setIsGenerating(false);
    setFlowState("results");
  };

  const openComparison = (result: TryOnResult) => {
    const original = personPhotos.find((p) => p.id === result.personPhotoId);
    if (!original) return;

    setComparisonData({
      originalUrl: original.url,
      resultUrl: result.resultUrl,
      personPhotoId: result.personPhotoId,
    });
    setFlowState("comparison");
  };

  const closeComparison = () => {
    setComparisonData(null);
    setFlowState("results");
  };

  const canGenerate =
    personPhotos.length > 0 &&
    clothingItem &&
    validationResult.valid &&
    !isGenerating;

  return (
    <div className="min-h-screen flex flex-col">
      <header
        style={{
          height: "64px",
          borderBottom: "1px solid var(--color-surface-light)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              backgroundColor: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingBag size={20} color="white" />
          </div>
          <span
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "var(--color-text-primary)",
            }}
          >
            Try Clothes
          </span>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="container-main">
          {flowState === "initial" && (
            <div className="initial-view">
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "48px",
                }}
              >
                <h1 style={{ marginBottom: "8px" }}>虚拟试衣</h1>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "16px",
                  }}
                >
                  上传您的照片，选择衣服，快速预览试穿效果
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "32px",
                  marginBottom: "32px",
                }}
              >
                <div className="upload-section">
                  <h3 style={{ marginBottom: "16px" }}>上传人物照片</h3>
                  <div className="upload-zone-container">
                    {personPhotos.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "12px",
                          marginBottom: "16px",
                        }}
                      >
                        {personPhotos.map((photo) => (
                          <div key={photo.id} className="photo-card">
                            <Image
                              src={photo.url}
                              alt="Person photo"
                              width={150}
                              height={150}
                              style={{
                                width: "100%",
                                height: "150px",
                                objectFit: "cover",
                                borderRadius: "12px",
                              }}
                            />
                            <button
                              onClick={() => removePersonPhoto(photo.id)}
                              style={{
                                position: "absolute",
                                top: "8px",
                                right: "8px",
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                backgroundColor: "rgba(248, 113, 113, 0.9)",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <X size={14} color="white" />
                            </button>
                            {validationResult.blockedPhotos.includes(photo.id) && (
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: "8px",
                                  left: "8px",
                                }}
                              >
                                <span className="badge badge-error">不匹配</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className={cn(
                        "upload-zone",
                        personPhotos.length > 0 && "upload-more"
                      )}
                      onClick={() => personInputRef.current?.click()}
                    >
                      <Upload
                        size={48}
                        color="var(--color-text-secondary)"
                      />
                      <p
                        style={{
                          color: "var(--color-text-secondary)",
                          marginTop: "8px",
                        }}
                      >
                        {personPhotos.length > 0
                          ? "点击添加更多照片"
                          : "Drag photos here or click to upload"}
                      </p>
                      <p
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        Support JPG, PNG
                      </p>
                    </div>

                    <input
                      ref={personInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      onChange={handlePersonUpload}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>

                <div className="upload-section">
                  <h3 style={{ marginBottom: "16px" }}>上传衣服图片</h3>

                  {clothingItem ? (
                    <div style={{ marginBottom: "16px" }}>
                      <div className="clothing-preview">
                        <Image
                          src={clothingItem.url}
                          alt="Clothing"
                          width={200}
                          height={200}
                          style={{
                            width: "200px",
                            height: "200px",
                            objectFit: "contain",
                            borderRadius: "12px",
                            backgroundColor: "var(--color-surface-light)",
                          }}
                        />
                        <span
                          className={cn(
                            "badge",
                            clothingItem.category === "top" && "badge-top",
                            clothingItem.category === "bottom" && "badge-bottom",
                            clothingItem.category === "skirt" && "badge-skirt"
                          )}
                          style={{
                            position: "absolute",
                            bottom: "16px",
                            left: "16px",
                          }}
                        >
                          {categoryLabels[clothingItem.category]}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setClothingItem(null);
                          setValidationResult({ valid: true, blockedPhotos: [] });
                        }}
                        style={{
                          marginTop: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          backgroundColor: "transparent",
                          border: "none",
                          color: "var(--color-text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        <X size={16} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="upload-zone"
                        onClick={() => clothingInputRef.current?.click()}
                        style={{ height: "180px", marginBottom: "24px" }}
                      >
                        <Upload
                          size={48}
                          color="var(--color-text-secondary)"
                        />
                        <p
                          style={{
                            color: "var(--color-text-secondary)",
                            marginTop: "8px",
                          }}
                        >
                          Upload clothing image
                        </p>
                      </div>

                      <input
                        ref={clothingInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleClothingUpload}
                        style={{ display: "none" }}
                      />

                      <div style={{ marginTop: "24px" }}>
                        <p
                          style={{
                            color: "var(--color-text-secondary)",
                            marginBottom: "12px",
                            fontSize: "14px",
                          }}
                        >
                          Or select example clothing:
                        </p>
                        <div style={{ display: "flex", gap: "12px" }}>
                          {[
                            { url: "/images/clothing-1.png", category: "top" },
                            { url: "/images/clothing-2.png", category: "bottom" },
                            { url: "/images/clothing-3.png", category: "skirt" },
                          ].map((example, i) => (
                            <div
                              key={i}
                              className="clothing-card-placeholder"
                              onClick={() =>
                                selectExampleClothing(example.url, example.category)
                              }
                              style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "12px",
                                backgroundColor: "var(--color-surface-light)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                border: "2px solid transparent",
                              }}
                            >
                              <ImageIcon
                                size={24}
                                color="var(--color-text-secondary)"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!validationResult.valid && validationResult.message && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "rgba(248, 113, 113, 0.1)",
                    border: "1px solid var(--color-error)",
                    borderRadius: "12px",
                    marginBottom: "24px",
                    color: "var(--color-error)",
                  }}
                >
                  {validationResult.message}
                </div>
              )}

              {errorMessage && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "rgba(248, 113, 113, 0.1)",
                    border: "1px solid var(--color-error)",
                    borderRadius: "12px",
                    marginBottom: "24px",
                    color: "var(--color-error)",
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <button
                className="btn-primary"
                disabled={!canGenerate}
                onClick={handleGenerate}
              >
                {personPhotos.length > 0 && clothingItem
                  ? `开始试穿 (${personPhotos.length}张照片)`
                  : "请上传照片和衣服"}
              </button>
            </div>
          )}

          {flowState === "processing" && (
            <div className="processing-view">
              <div style={{ textAlign: "center", marginBottom: "48px" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 24px",
                    borderRadius: "50%",
                    backgroundColor: "var(--color-surface-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <RefreshCw
                    size={40}
                    color="var(--color-accent)"
                    style={{
                      animation: "spin 1s linear infinite",
                    }}
                  />
                </div>
                <h2>正在生成试穿效果</h2>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    marginTop: "8px",
                  }}
                >
                  正在处理第 {processingIndex + 1} / {totalCount} 张照片
                </p>
              </div>

              <div className="progress-bar" style={{ marginBottom: "16px" }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${(currentProgress / totalCount) * 100}%`,
                  }}
                />
              </div>

              <p style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
                {Math.round((currentProgress / totalCount) * 100)}% complete
              </p>
            </div>
          )}

          {flowState === "results" && (
            <div className="results-view">
              <div style={{ marginBottom: "24px" }}>
                <button
                  onClick={() => {
                    setFlowState("initial");
                    setResults([]);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "transparent",
                    border: "none",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                    marginBottom: "16px",
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to upload</span>
                </button>
                <h2>试穿结果</h2>
                <p style={{ color: "var(--color-text-secondary)" }}>
                  共 {results.length} 张试穿效果图
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: "24px",
                }}
              >
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    className="card card-hover"
                    onClick={() => openComparison(result)}
                    style={{ cursor: "pointer" }}
                  >
                    <div style={{ position: "relative" }}>
                      <Image
                        src={result.resultUrl}
                        alt={`Try-on result ${index + 1}`}
                        width={300}
                        height={300}
                        style={{
                          width: "100%",
                          height: "300px",
                          objectFit: "cover",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "12px",
                          right: "12px",
                          backgroundColor: "rgba(0, 0, 0, 0.6)",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <ArrowRight size={16} />
                        <span>Compare</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {flowState === "comparison" && comparisonData && (
            <div className="comparison-view">
              <button
                onClick={closeComparison}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                  marginBottom: "24px",
                }}
              >
                <ArrowLeft size={16} />
                <span>Back to results</span>
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "24px",
                }}
              >
                <div>
                  <h3 style={{ marginBottom: "16px" }}>Original</h3>
                  <div className="card">
                    <Image
                      src={comparisonData.originalUrl}
                      alt="Original"
                      width={500}
                      height={500}
                      style={{
                        width: "100%",
                        height: "auto",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h3 style={{ marginBottom: "16px" }}>Try-on Result</h3>
                  <div className="card">
                    <Image
                      src={comparisonData.resultUrl}
                      alt="Try-on result"
                      width={500}
                      height={500}
                      style={{
                        width: "100%",
                        height: "auto",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer
        style={{
          height: "60px",
          borderTop: "1px solid var(--color-surface-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
          © 2026 Try Clothes. All rights reserved.
        </p>
      </footer>
    </div>
  );
}