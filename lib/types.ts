// lib/types.ts

export interface AcastingJob {
  id: string;
  title: string;
  description: string;
  salary: string | null;
  city: string | null;
  expiryDate: string | null;
  slugOrId: string;
  category: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface AnnotatedJob extends AcastingJob {
  processedStatus: string | null;
}

export const AVAILABLE_FONTS = [
  { value: 'Arial', label: 'Arial', cloudinary: 'Arial' },
  { value: 'Georgia', label: 'Georgia', cloudinary: 'Georgia' },
  { value: 'Roboto', label: 'Roboto', cloudinary: 'Roboto' },
  { value: 'Montserrat', label: 'Montserrat', cloudinary: 'Montserrat' },
  { value: 'Playfair Display', label: 'Playfair', cloudinary: 'Playfair%20Display' },
  { value: 'Oswald', label: 'Oswald', cloudinary: 'Oswald' },
  { value: 'Lato', label: 'Lato', cloudinary: 'Lato' },
  { value: 'Raleway', label: 'Raleway', cloudinary: 'Raleway' },
] as const;

export interface CustomImageSettings {
  // Title
  titleText?: string;
  titleFont?: string;
  titleColor?: string;
  titleSize?: number;
  titleY?: number;
  // Subtitle / Salary
  subtitleFont?: string;
  subtitleColor?: string;
  subtitleSize?: number;
  // CTA
  ctaColor?: string;
  ctaText?: string;
  // Background / Overlay
  bgOverlayColor?: string;
  bgOverlayOpacity?: number;
  brightness?: number;
  // Accent
  accentColor?: string;
  // 🆕 Quality Controls
  outputQuality?: number;      // 1-100 (default: 95)
  outputWidth?: number;        // larghezza personalizzata (default: 1080)
  outputHeight?: number;       // altezza personalizzata (default: 1920)
  outputFormat?: 'png' | 'jpg' | 'webp' | 'auto';
  enableProgressive?: boolean;  // caricamento progressivo
  useLossyPNG?: boolean;       // compressione PNG ottimizzata
}

export const DEFAULT_CUSTOM_SETTINGS: CustomImageSettings = {
  titleFont: 'Arial',
  titleColor: 'white',
  titleSize: 54,
  titleY: -250,
  subtitleFont: 'Arial',
  subtitleColor: 'white',
  subtitleSize: 46,
  ctaColor: '7C3AED',
  ctaText: 'ACASTING.SE',
  bgOverlayColor: '000000',
  bgOverlayOpacity: 75,
  brightness: -75,
  accentColor: '7C3AED',
  outputQuality: 90,
  outputWidth: 1080,
  outputHeight: 1920,
  outputFormat: 'auto',
  enableProgressive: true,
  useLossyPNG: true,
};

export interface ProcessedJob {
  id: string;
  jobId: string;
  title: string;
  description: string | null;
  salary: string | null;
  city: string | null;
  expiryDate: string | null;
  slugOrId: string;
  category: string | null;
  originalImage: string | null;
  generatedImage: string | null;
  style: ImageStyle;
  status: JobStatus;
  publishedTo: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  customSettings?: CustomImageSettings | null;
}

export type JobStatus = 'pending' | 'generated' | 'approved' | 'published' | 'skipped';
export type ImageStyle = 'cinematic' | 'purple' | 'noir' | 'custom';
export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';

export interface PublishResult {
  platform: Platform;
  success: boolean;
  postId?: string;
  error?: string;
}

export const STYLE_LABELS: Record<ImageStyle, { label: string; desc: string; brightness: number; color: string }> = {
  cinematic: { label: 'Cinematic', desc: 'Dark HD overlay, film look', brightness: -85, color: 'white' },
  purple: { label: 'Acasting Purple', desc: 'Brand tone, violet accents', brightness: -60, color: 'white' },
  noir: { label: 'Noir', desc: 'Max contrast B&W', brightness: -95, color: 'white' },
  custom: { label: 'Custom Studio', desc: 'Full control: fonts, colors, layout', brightness: -65, color: 'white' },
};

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: string }> = {
  facebook: { label: 'Facebook', color: '#1877F2', icon: 'facebook' },
  instagram: { label: 'Instagram', color: '#E1306C', icon: 'instagram' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: 'linkedin' },
  tiktok: { label: 'TikTok', color: '#000000', icon: 'tiktok' },
};

export const COLOR_PRESETS = [
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'FFDF00', label: 'Gold', hex: '#FFDF00' },
  { value: '7C3AED', label: 'Purple', hex: '#7C3AED' },
  { value: 'A78BFA', label: 'Lavender', hex: '#A78BFA' },
  { value: '10B981', label: 'Emerald', hex: '#10B981' },
  { value: 'F59E0B', label: 'Amber', hex: '#F59E0B' },
  { value: 'EF4444', label: 'Red', hex: '#EF4444' },
  { value: '3B82F6', label: 'Blue', hex: '#3B82F6' },
  { value: '000000', label: 'Black', hex: '#000000' },
] as const;

export const QUALITY_PRESETS = [
  { label: 'Ultra HD', quality: 100, format: 'png' as const, width: 1080, height: 1920, desc: 'Lossless PNG, ~1.5MB' },
  { label: 'High Quality', quality: 90, format: 'auto' as const, width: 1080, height: 1920, desc: 'Best balance, ~600KB' },
  { label: 'Retina 2x', quality: 85, format: 'auto' as const, width: 2160, height: 3840, desc: 'Double resolution, ~1.2MB' },
  { label: 'Fast Web', quality: 80, format: 'auto' as const, width: 1080, height: 1920, desc: 'WebP optimized, ~400KB' },
] as const;