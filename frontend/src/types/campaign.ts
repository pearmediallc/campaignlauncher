export interface CampaignFormData {
  campaignName: string;
  budgetType: 'daily' | 'lifetime';
  dailyBudget?: number;
  lifetimeBudget?: number;
  urlType: 'lead_gen' | 'call';
  url: string;
  primaryText: string; // Meta's "Primary Text" (was adCopy)
  headline: string; // Meta's "Headline"
  description: string; // Meta's "Description"
  image?: File;
  images?: File[]; // For carousel ads
  video?: File;
  mediaType: 'single_image' | 'carousel' | 'single_video';
  callToAction: string;
  conversionLocation: 'website' | 'calls';
  schedule?: {
    startTime?: string;
    endTime?: string;
    timezone?: string;
    dayparting?: { // Ad scheduling by hour
      monday?: { start: number; end: number }[];
      tuesday?: { start: number; end: number }[];
      wednesday?: { start: number; end: number }[];
      thursday?: { start: number; end: number }[];
      friday?: { start: number; end: number }[];
      saturday?: { start: number; end: number }[];
      sunday?: { start: number; end: number }[];
    };
  };
  targeting: {
    locations: {
      countries?: string[];
      states?: string[];
      cities?: string[];
      zips?: string[];
      radiusTargeting?: {
        latitude: number;
        longitude: number;
        radius: number;
        radiusUnit: 'mile' | 'kilometer';
      }[];
    };
    ageMin: number;
    ageMax: number;
    genders?: ('male' | 'female' | 'all')[];
  };
  placements: {
    facebook: string[];
    instagram: string[];
    audience_network: string[];
    messenger: string[];
  };
  selectedPageId?: string;
}

export interface AdVariation {
  headline: string;
  description: string;
  primaryText: string; // Meta's "Primary Text" (was adCopy)
  url?: string;
  image?: File;
  images?: File[]; // For carousel ads
  video?: File;
  mediaType?: 'single_image' | 'carousel' | 'single_video';
  callToAction?: string;
}

export interface BulkCampaignData extends CampaignFormData {
  variations: AdVariation[];
}

export interface LinkPreview {
  title: string;
  description: string;
  image: string;
  siteName?: string;
}

export interface CampaignResponse {
  success: boolean;
  message: string;
  data?: {
    campaign: { id: string; name: string };
    adSet: {
      id: string;
      name: string;
      _skippedFields?: any; // Optional: fields skipped when using safe mode fallback
    };
    ads: Array<{ id: string; name: string }>;
  };
  error?: string;
}