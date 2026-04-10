export type ClothingCategory = 'top' | 'bottom' | 'skirt';
export type PersonType = 'full' | 'upper' | 'invalid';
export type TryOnStatus = 'processing' | 'completed' | 'failed';
export type FlowState = 'initial' | 'processing' | 'results' | 'comparison';

export interface PersonPhoto {
  id: string;
  url: string;
  type: PersonType;
  file?: File;
  preview?: string;
}

export interface ClothingItem {
  id: string;
  url: string;
  category: ClothingCategory;
  file?: File;
  isExample?: boolean;
}

export interface TryOnResult {
  id: string;
  personPhotoId: string;
  resultUrl: string;
  status: TryOnStatus;
  originalUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  blockedPhotos: string[];
}

export interface ComparisonData {
  originalUrl: string;
  resultUrl: string;
  personPhotoId: string;
}