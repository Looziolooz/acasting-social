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
}

export type JobStatus = 'pending' | 'generated' | 'approved' | 'published' | 'skipped';
export type ImageStyle = 'dark' | 'purple' | 'noir' | 'custom';
export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';

export interface CustomOverlayStyle {
  brightness: number;          // -100 to 0
  overlayColor: string;        // hex e.g. "000000"
  overlayOpacity: number;      // 0-100
  titleFontFamily: string;     // e.g. "Arial"
  titleFontSize: number;       // 28-80
  titleColor: string;          // hex
  titleY: number;              // vertical position offset
  bodyFontSize: number;        // 28-60
  bodyColor: string;           // hex
  accentColor: string;         // hex for divider + brand
  bodyY: number;               // vertical offset for salary/date block
}

export const DEFAULT_CUSTOM_STYLE: CustomOverlayStyle = {
  brightness: -75,
  overlayColor: '000000',
  overlayOpacity: 60,
  titleFontFamily: 'Arial',
  titleFontSize: 46,
  titleColor: 'FFFFFF',
  titleY: -250,
  bodyFontSize: 42,
  bodyColor: 'FFFFFF',
  accentColor: '7C3AED',
  bodyY: 40,
};

export const FONT_OPTIONS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
];

export interface GenerateImageRequest {
  jobId: string;
  style?: ImageStyle;
  customStyle?: CustomOverlayStyle;
}

export interface PublishRequest {
  jobId: string;
  platforms: Platform[];
  caption?: string;
}

export interface PublishResult {
  platform: Platform;
  success: boolean;
  postId?: string;
  error?: string;
}

export const STYLE_LABELS: Record<ImageStyle, { label: string; desc: string }> = {
  dark:   { label: 'Cinematic',      desc: 'Classic dark overlay' },
  purple: { label: 'Acasting Purple', desc: 'Official brand tone' },
  noir:   { label: 'Noir',           desc: 'Maximum contrast' },
  custom: { label: 'Custom',         desc: 'Full customization' },
};

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string }> = {
  facebook:  { label: 'Facebook',  color: '#1877F2' },
  instagram: { label: 'Instagram', color: '#E1306C' },
  linkedin:  { label: 'LinkedIn',  color: '#0A66C2' },
  tiktok:    { label: 'TikTok',    color: '#000000' },
};
