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
  // Campi aggiuntivi per la personalizzazione custom
  customSettings?: CustomImageSettings | null;
}

export type JobStatus = 'pending' | 'generated' | 'approved' | 'published' | 'skipped';
// 'warm' rimosso e sostituito con 'custom' come richiesto
export type ImageStyle = 'dark' | 'purple' | 'noir' | 'custom'; 
export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';

export interface CustomImageSettings {
  titleFont?: string;
  titleColor?: string;
  titleSize?: number;
  titleY?: number;
  salaryColor?: string;
  bgColor?: string;
  brightness?: number;
}

export interface GenerateImageRequest {
  jobId: string;
  style?: ImageStyle;
  customSettings?: CustomImageSettings;
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

export const STYLE_LABELS: Record<ImageStyle, { label: string; desc: string; brightness: number; color: string }> = {
  dark: {
    label: 'Cinematic',
    desc: 'Classic dark overlay (Workflow Fix)',
    brightness: -85,
    color: 'white',
  },
  purple: {
    label: 'Acasting Purple',
    desc: 'Official brand tone',
    brightness: -60,
    color: 'white',
  },
  noir: {
    label: 'Noir',
    desc: 'Maximum contrast B&W',
    brightness: -95,
    color: 'white',
  },
  custom: {
    label: 'Custom Edit',
    desc: 'Personalizza font, posizioni e colori',
    brightness: -65,
    color: 'white',
  },
};

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: string }> = {
  facebook: { label: 'Facebook', color: '#1877F2', icon: 'facebook' },
  instagram: { label: 'Instagram', color: '#E1306C', icon: 'instagram' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: 'linkedin' },
  tiktok: { label: 'TikTok', color: '#000000', icon: 'tiktok' },
};