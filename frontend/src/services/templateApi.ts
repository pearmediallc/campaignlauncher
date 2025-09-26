import axios from 'axios';

// Template data structure matching Strategy 1-50-1 form
export interface TemplateData {
  // Campaign section
  campaignName?: string;
  objective?: string;
  campaignBudgetOptimization?: boolean;
  specialAdCategory?: string;

  // AdSet section
  adSetName?: string;
  startDate?: string;
  endDate?: string;
  bidStrategy?: string;
  billingEvent?: string;
  budgetType?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;

  // Targeting
  locations?: any[];
  ageMin?: number;
  ageMax?: number;
  genders?: string;
  detailedTargeting?: any;
  customAudiences?: string[];
  placements?: string[];

  // Ad section
  adName?: string;
  facebookPage?: string;
  instagramAccount?: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  websiteUrl?: string;
  displayLink?: string;
  urlParameters?: string;
  callToAction?: string;
  pixelId?: string;

  // Media
  mediaType?: 'image' | 'video' | 'carousel';
  mediaUrls?: string[];
  carouselCards?: any[];
  videoThumbnailUrl?: string;
}

export interface CampaignTemplate {
  id: number;
  templateName: string;
  description?: string;
  category: 'personal' | 'shared' | 'team';
  templateData: TemplateData;
  mediaUrls?: string[];
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  templateName: string;
  templateData: TemplateData;
  mediaUrls?: string[];
  description?: string;
  category?: 'personal' | 'shared' | 'team';
  setAsDefault?: boolean;
}

export interface TemplateFilters {
  category?: string;
  search?: string;
  includeShared?: boolean;
}

class TemplateApi {
  private baseURL = '/api/templates';

  // Get all templates with optional filters
  async getTemplates(filters?: TemplateFilters): Promise<CampaignTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.includeShared !== undefined) {
        params.append('includeShared', filters.includeShared.toString());
      }

      const response = await axios.get(`${this.baseURL}?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      throw error;
    }
  }

  // Get single template with full data
  async getTemplate(id: number): Promise<CampaignTemplate> {
    try {
      const response = await axios.get(`${this.baseURL}/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch template:', error);
      throw error;
    }
  }

  // Create new template
  async createTemplate(data: CreateTemplateRequest): Promise<CampaignTemplate> {
    try {
      const response = await axios.post(this.baseURL, data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  }

  // Update template
  async updateTemplate(id: number, data: Partial<CreateTemplateRequest>): Promise<CampaignTemplate> {
    try {
      const response = await axios.put(`${this.baseURL}/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  }

  // Delete template
  async deleteTemplate(id: number): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/${id}`);
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  }

  // Set template as default
  async setDefaultTemplate(id: number): Promise<void> {
    try {
      await axios.put(`${this.baseURL}/${id}/default`);
    } catch (error) {
      console.error('Failed to set default template:', error);
      throw error;
    }
  }

  // Get user's default template
  async getDefaultTemplate(): Promise<CampaignTemplate | null> {
    try {
      const response = await axios.get(`${this.baseURL}/user/default`);
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null; // No default template
      }
      console.error('Failed to fetch default template:', error);
      throw error;
    }
  }

  // Save current form data as template
  async saveFormAsTemplate(
    formData: any,
    templateName: string,
    description?: string,
    setAsDefault = false
  ): Promise<CampaignTemplate> {
    try {
      const templateData: TemplateData = {
        // Map form data to template structure
        campaignName: formData.campaignName,
        objective: formData.objective,
        campaignBudgetOptimization: formData.campaignBudgetOptimization,
        specialAdCategory: formData.specialAdCategory,

        adSetName: formData.adSetName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        bidStrategy: formData.bidStrategy,
        billingEvent: formData.billingEvent,
        budgetType: formData.budgetType,
        dailyBudget: formData.dailyBudget,
        lifetimeBudget: formData.lifetimeBudget,

        locations: formData.locations,
        ageMin: formData.ageMin,
        ageMax: formData.ageMax,
        genders: formData.genders,
        detailedTargeting: formData.detailedTargeting,
        customAudiences: formData.customAudiences,
        placements: formData.placements,

        adName: formData.adName,
        facebookPage: formData.facebookPage,
        instagramAccount: formData.instagramAccount,
        primaryText: formData.primaryText,
        headline: formData.headline,
        description: formData.description,
        websiteUrl: formData.websiteUrl,
        displayLink: formData.displayLink,
        urlParameters: formData.urlParameters,
        callToAction: formData.callToAction,
        pixelId: formData.pixelId,

        mediaType: formData.mediaType,
        mediaUrls: formData.mediaUrls,
        carouselCards: formData.carouselCards,
        videoThumbnailUrl: formData.videoThumbnailUrl,
      };

      const request: CreateTemplateRequest = {
        templateName,
        templateData,
        mediaUrls: formData.mediaUrls,
        description,
        setAsDefault,
      };

      return await this.createTemplate(request);
    } catch (error) {
      console.error('Failed to save form as template:', error);
      throw error;
    }
  }

  // Load template data into form
  loadTemplateIntoForm(template: CampaignTemplate): TemplateData {
    return template.templateData;
  }
}

export const templateApi = new TemplateApi();