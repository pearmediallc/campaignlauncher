/**
 * LocalStorage Template Service
 * Immediate solution for templates without needing backend database
 * Works completely client-side - no API calls needed!
 */

export interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  data: any;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

class LocalTemplateService {
  private readonly STORAGE_KEY = 'fb_campaign_templates';

  /**
   * Get all templates from localStorage
   */
  getTemplates(): CampaignTemplate[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load templates:', error);
      return [];
    }
  }

  /**
   * Save a new template
   */
  saveTemplate(name: string, description: string, data: any): CampaignTemplate {
    const templates = this.getTemplates();

    const newTemplate: CampaignTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    };

    templates.push(newTemplate);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));

    return newTemplate;
  }

  /**
   * Update an existing template
   */
  updateTemplate(id: string, updates: Partial<CampaignTemplate>): boolean {
    const templates = this.getTemplates();
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) return false;

    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
    return true;
  }

  /**
   * Delete a template
   */
  deleteTemplate(id: string): boolean {
    const templates = this.getTemplates();
    const filtered = templates.filter(t => t.id !== id);

    if (filtered.length === templates.length) return false;

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  /**
   * Get a single template by ID
   */
  getTemplate(id: string): CampaignTemplate | null {
    const templates = this.getTemplates();
    return templates.find(t => t.id === id) || null;
  }

  /**
   * Load template data into form
   */
  loadTemplateData(id: string): any | null {
    const template = this.getTemplate(id);
    if (!template) return null;

    // Increment usage count
    this.updateTemplate(id, {
      usageCount: template.usageCount + 1
    });

    return template.data;
  }

  /**
   * Export templates to JSON file
   */
  exportTemplates(): void {
    const templates = this.getTemplates();
    const dataStr = JSON.stringify(templates, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `campaign_templates_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  /**
   * Import templates from JSON file
   */
  async importTemplates(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          const existing = this.getTemplates();

          // Merge imported with existing (avoid duplicates by name)
          const existingNames = new Set(existing.map(t => t.name));
          const newTemplates = imported.filter((t: CampaignTemplate) =>
            !existingNames.has(t.name)
          );

          const merged = [...existing, ...newTemplates];
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));

          resolve(newTemplates.length);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

export default new LocalTemplateService();