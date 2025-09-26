import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  InputAdornment,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Search as SearchIcon,
  ContentCopy as DuplicateIcon,
  Edit as EditIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { templateApi, CampaignTemplate, TemplateData } from '../../services/templateApi';
import { toast } from 'react-toastify';

interface TemplateManagerProps {
  formData: any;
  onLoadTemplate: (templateData: TemplateData) => void;
  onClearForm: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  formData,
  onLoadTemplate,
  onClearForm
}) => {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadMenuAnchor, setLoadMenuAnchor] = useState<null | HTMLElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch templates when component mounts
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const fetchedTemplates = await templateApi.getTemplates({
        includeShared: true
      });
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = async (template: CampaignTemplate) => {
    try {
      setLoading(true);
      const fullTemplate = await templateApi.getTemplate(template.id);
      onLoadTemplate(fullTemplate.templateData);
      setLoadMenuAnchor(null);
      toast.success(`Template "${template.templateName}" loaded successfully`);
    } catch (error) {
      console.error('Failed to load template:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      setLoading(true);
      const newTemplate = await templateApi.saveFormAsTemplate(
        formData,
        templateName,
        templateDescription,
        setAsDefault
      );

      toast.success(`Template "${newTemplate.templateName}" saved successfully`);
      setSaveDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      setSetAsDefault(false);
      fetchTemplates(); // Refresh template list
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (template: CampaignTemplate) => {
    try {
      await templateApi.setDefaultTemplate(template.id);
      toast.success(`"${template.templateName}" set as default template`);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to set default template:', error);
      toast.error('Failed to set default template');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      await templateApi.deleteTemplate(selectedTemplate.id);
      toast.success(`Template "${selectedTemplate.templateName}" deleted`);
      setDeleteConfirmOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {/* Load Template Button */}
      <Button
        variant="outlined"
        startIcon={<LoadIcon />}
        onClick={(e) => setLoadMenuAnchor(e.currentTarget)}
        disabled={loading}
      >
        Load Template
      </Button>

      {/* Save as Template Button */}
      <Button
        variant="outlined"
        startIcon={<SaveIcon />}
        onClick={() => setSaveDialogOpen(true)}
        disabled={loading}
        color="success"
      >
        Save as Template
      </Button>

      {/* Clear Form Button */}
      <Button
        variant="outlined"
        startIcon={<ClearIcon />}
        onClick={onClearForm}
        disabled={loading}
        color="error"
      >
        Clear Form
      </Button>

      {/* Load Template Menu */}
      <Menu
        anchorEl={loadMenuAnchor}
        open={Boolean(loadMenuAnchor)}
        onClose={() => setLoadMenuAnchor(null)}
        PaperProps={{
          sx: { maxWidth: 400, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : filteredTemplates.length === 0 ? (
          <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            No templates found
          </Typography>
        ) : (
          <List sx={{ pt: 0 }}>
            {filteredTemplates.map((template) => (
              <ListItem key={template.id} disablePadding>
                <ListItemButton
                  onClick={() => handleLoadTemplate(template)}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                >
                  <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {template.isDefault && (
                        <Tooltip title="Default template">
                          <StarIcon color="primary" fontSize="small" />
                        </Tooltip>
                      )}
                      <Typography variant="subtitle2">
                        {template.templateName}
                      </Typography>
                      <Chip
                        label={template.category}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      {template.description && (
                        <Typography variant="caption" color="text.secondary">
                          {template.description}
                        </Typography>
                      )}
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        Used {template.usageCount} times
                        {template.lastUsedAt && ` • Last used ${new Date(template.lastUsedAt).toLocaleDateString()}`}
                      </Typography>
                    </Box>
                  }
                  />
                </ListItemButton>
                <ListItemSecondaryAction>
                  <Tooltip title="Set as default">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(template);
                      }}
                      disabled={template.isDefault}
                    >
                      {template.isDefault ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete template">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Menu>

      {/* Save Template Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save as Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            variant="outlined"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                color="primary"
              />
            }
            label="Set as default template"
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            This will save all current form fields including targeting, budget, and creative settings.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={loading || !templateName.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            Save Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the template "{selectedTemplate?.templateName}"?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteTemplate}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateManager;