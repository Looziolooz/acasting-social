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
export type ImageStyle = 'dark' | 'purple' | 'noir' | 'warm';
export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';

export interface GenerateImageRequest {
  jobId: string;
  style?: ImageStyle;
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
    label: 'Cinematica',
    desc: 'Overlay scuro classico',
    brightness: -80,
    color: 'white',
  },
  purple: {
    label: 'Viola Acasting',
    desc: 'Tono brand ufficiale',
    brightness: -60,
    color: 'white',
  },
  noir: {
    label: 'Noir',
    desc: 'Contrasto massimo',
    brightness: -95,
    color: 'white',
  },
  warm: {
    label: 'Calda',
    desc: 'Tono caldo cinematico',
    brightness: -65,
    color: 'FFEDD8',
  },
};

export const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: string }> = {
  facebook: { label: 'Facebook', color: '#1877F2', icon: 'facebook' },
  instagram: { label: 'Instagram', color: '#E1306C', icon: 'instagram' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: 'linkedin' },
  tiktok: { label: 'TikTok', color: '#000000', icon: 'tiktok' },
};
