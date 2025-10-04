import axios from 'axios';

// Template data structure - matches Strategy150FormData for complete field coverage
export interface TemplateData {
  // Campaign Level
  campaignName?: string;
  buyingType?: 'AUCTION' | 'RESERVED';
  objective?: 'OUTCOME_LEADS' | 'PHONE_CALL' | 'OUTCOME_SALES';
  budgetLevel?: 'campaign' | 'adset';
  specialAdCategories?: string[];
  campaignBudgetOptimization?: boolean;
  bidStrategy?: string;
  budgetType?: 'daily' | 'lifetime';

  // Campaign Budget
  campaignBudget?: {
    dailyBudget?: number;
    lifetimeBudget?: number;
  };

  // Ad Set Level
  performanceGoal?: string;
  pixel?: string;
  conversionEvent?: 'Lead' | 'Contact' | 'Purchase';
  attributionSetting?: string;
  attributionWindow?: string;

  // Ad Set Budget & Schedule
  adSetBudget?: {
    dailyBudget?: number;
    lifetimeBudget?: number;
    startDate?: string;
    endDate?: string;
    scheduleType?: 'run_continuously' | 'scheduled';
    dayparting?: Array<{
      days: string[];
      startTime: string;
      endTime: string;
    }>;
    spendingLimits?: {
      daily?: number;
      lifetime?: number;
    };
  };

  // Enhanced Targeting
  targeting?: {
    locations?: {
      countries?: string[];
      regions?: string[];
      cities?: string[];
      zips?: string[];
      addressRadius?: Array<{
        address: string;
        radius: number;
        distanceUnit: 'mile' | 'kilometer';
      }>;
    };
    ageMin?: number;
    ageMax?: number;
    ageRange?: number[];
    genders?: string[];
    languages?: string[];
    detailedTargeting?: {
      interests?: string[];
      behaviors?: string[];
      demographics?: string[];
    };
    customAudiences?: string[];
    lookalikeAudiences?: string[];
    connections?: {
      include?: string[];
      exclude?: string[];
    };
  };

  // Enhanced Placements
  placementType?: 'automatic' | 'manual';
  placements?: {
    facebook?: string[];
    instagram?: string[];
    messenger?: string[];
    audienceNetwork?: string[];
    devices?: string[];
    platforms?: string[];
    publisherPlatforms?: string[];
  };

  // Ad Level
  facebookPage?: string;
  instagramAccount?: string;
  urlType?: string;
  url?: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  displayLink?: string;
  mediaType?: 'single_image' | 'single_video' | 'carousel';

  // Duplication Settings
  duplicationSettings?: {
    defaultBudgetPerAdSet?: number;
    customBudgets?: Array<{
      adSetIndex: number;
      budget: number;
    }>;
    budgetDistributionType?: 'equal' | 'custom' | 'weighted';
  };

  // Additional fields
  costCap?: number;
  minRoas?: number;
  bidAmount?: number;
  campaignSpendingLimit?: number;
  manualPixelId?: string;
  publishDirectly?: boolean;
  conversionLocation?: 'website' | 'calls';
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
      // DEBUG: Log incoming form data
      console.log('🔍 DEBUG - Template Save (BEFORE stripping):');
      console.log('  📦 Full formData keys:', Object.keys(formData));
      console.log('  📦 formData.primaryText:', formData.primaryText);
      console.log('  📦 formData.headline:', formData.headline);
      console.log('  📦 formData.description:', formData.description);
      console.log('  📦 formData.callToAction:', formData.callToAction);

      // Strip out non-saveable fields (files, temporary state)
      const {
        mediaFiles,     // Don't save actual File objects
        image,
        video,
        images,
        postId,         // Don't save runtime post IDs
        manualPostId,
        useExistingPost,
        ...templateData  // Everything else gets saved directly
      } = formData;

      // DEBUG: Log what will be saved
      console.log('🔍 DEBUG - Template Save (AFTER stripping):');
      console.log('  📦 templateData keys:', Object.keys(templateData));
      console.log('  📦 templateData.primaryText:', templateData.primaryText);
      console.log('  📦 templateData.headline:', templateData.headline);
      console.log('  📦 templateData.description:', templateData.description);
      console.log('  📦 templateData.callToAction:', templateData.callToAction);

      const request: CreateTemplateRequest = {
        templateName,
        templateData,   // Direct pass-through - preserves ALL editable fields
        mediaUrls: formData.mediaUrls,
        description,
        setAsDefault,
      };

      console.log('🔍 DEBUG - Final request being sent to backend:', {
        templateName: request.templateName,
        templateDataKeys: Object.keys(request.templateData),
        description: request.description
      });

      return await this.createTemplate(request);
    } catch (error) {
      console.error('Failed to save form as template:', error);
      throw error;
    }
  }

  // Load template data into form
  loadTemplateIntoForm(template: CampaignTemplate): TemplateData {
    // DEBUG: Log loaded template data
    console.log('🔍 DEBUG - Template Load:');
    console.log('  📦 template.templateName:', template.templateName);
    console.log('  📦 template.id:', template.id);
    console.log('  📦 templateData keys:', Object.keys(template.templateData));
    console.log('  📦 templateData.primaryText:', template.templateData.primaryText);
    console.log('  📦 templateData.headline:', template.templateData.headline);
    console.log('  📦 templateData.description:', template.templateData.description);
    console.log('  📦 templateData.callToAction:', template.templateData.callToAction);
    console.log('  📦 Full templateData:', template.templateData);

    return template.templateData;
  }
}

export const templateApi = new TemplateApi();