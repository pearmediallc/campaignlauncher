import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  InputAdornment,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardMedia,
  CardContent,
  Slider,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Radio,
  RadioGroup,
  Tabs,
  Tab,
  Snackbar,
} from '@mui/material';
import { 
  CloudUpload, 
  Add, 
  Delete, 
  Image, 
  ViewCarousel, 
  VideoLibrary,
  Schedule,
  Link as LinkIcon,
  ExpandMore,
  LocationOn,
  People,
  Devices,
  AttachMoney
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { CampaignFormData, AdVariation, LinkPreview } from '../types/campaign';
import { campaignApi } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import DaypartingSchedule from './DaypartingSchedule';
import { getCurrentResources } from '../utils/resourceHelper';

// Facebook Call-to-Action options
const CALL_TO_ACTION_OPTIONS = [
  'LEARN_MORE',
  'SHOP_NOW',
  'SIGN_UP',
  'DOWNLOAD',
  'GET_QUOTE',
  'CONTACT_US',
  'SUBSCRIBE',
  'APPLY_NOW',
  'BOOK_NOW',
  'GET_OFFER',
  'GET_SHOWTIMES',
  'LISTEN_NOW',
  'WATCH_MORE',
  'REQUEST_TIME',
  'SEE_MENU',
  'OPEN_LINK',
  'BUY_NOW',
  'BET_NOW',
  'ADD_TO_CART',
  'ORDER_NOW',
  'PLAY_GAME',
  'DONATE',
  'GET_DIRECTIONS',
  'SEND_MESSAGE',
  'CALL_NOW'
];

// Common countries for targeting
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
];

// US States for targeting
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington, D.C.' },
];

// Major US Cities for targeting
const US_CITIES = [
  { name: 'New York, NY', key: '2490299' },
  { name: 'Los Angeles, CA', key: '2420379' },
  { name: 'Chicago, IL', key: '2379574' },
  { name: 'Houston, TX', key: '2424766' },
  { name: 'Phoenix, AZ', key: '2471390' },
  { name: 'Philadelphia, PA', key: '2471217' },
  { name: 'San Antonio, TX', key: '2487796' },
  { name: 'San Diego, CA', key: '2487889' },
  { name: 'Dallas, TX', key: '2388929' },
  { name: 'San Jose, CA', key: '2488042' },
  { name: 'Austin, TX', key: '2357536' },
  { name: 'Jacksonville, FL', key: '2428344' },
  { name: 'Fort Worth, TX', key: '2406080' },
  { name: 'Columbus, OH', key: '2383660' },
  { name: 'Charlotte, NC', key: '2378426' },
  { name: 'San Francisco, CA', key: '2487956' },
  { name: 'Indianapolis, IN', key: '2427032' },
  { name: 'Seattle, WA', key: '2490383' },
  { name: 'Denver, CO', key: '2391279' },
  { name: 'Boston, MA', key: '2367105' },
  { name: 'Miami, FL', key: '2450022' },
  { name: 'Atlanta, GA', key: '2357024' },
  { name: 'Las Vegas, NV', key: '2436704' },
  { name: 'Portland, OR', key: '2475687' },
  { name: 'Detroit, MI', key: '2391585' },
];

// Placement options
const PLACEMENT_OPTIONS = {
  facebook: [
    { value: 'feed', label: 'News Feed' },
    { value: 'right_hand_column', label: 'Right Column' },
    { value: 'instant_article', label: 'Instant Articles' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'video_feeds', label: 'Video Feeds' },
    { value: 'story', label: 'Stories' },
  ],
  instagram: [
    { value: 'stream', label: 'Feed' },
    { value: 'story', label: 'Stories' },
    { value: 'explore', label: 'Explore' },
    { value: 'reels', label: 'Reels' },
  ],
  audience_network: [
    { value: 'classic', label: 'Native, Banner and Interstitial' },
    { value: 'rewarded_video', label: 'Rewarded Video' },
  ],
  messenger: [
    { value: 'messenger_home', label: 'Messenger Home' },
    { value: 'story', label: 'Messenger Stories' },
  ],
};

const CampaignForm: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [carouselImages, setCarouselImages] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'single_image' | 'carousel' | 'single_video'>('single_image');
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US']);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [customLocations, setCustomLocations] = useState<string>('');
  const [locationType, setLocationType] = useState<'countries' | 'states' | 'cities' | 'custom'>('countries');
  const [ageRange, setAgeRange] = useState<number[]>([18, 65]);
  const [selectedPlacements, setSelectedPlacements] = useState({
    facebook: ['feed', 'story'],
    instagram: ['stream', 'story'],
    audience_network: ['classic'],
    messenger: ['messenger_home']
  });
  const [dayparting, setDayparting] = useState({});
  // const [availablePages, setAvailablePages] = useState<{id: string, name: string}[]>([]);
  const [currentResources, setCurrentResources] = useState<any>(null);
  
  // Ad Scraper integration state
  const [importedImageUrl, setImportedImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const canCreateCampaign = hasPermission('campaign', 'create');

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CampaignFormData>({
    defaultValues: {
      campaignName: '',
      budgetType: 'daily',
      dailyBudget: 50,
      lifetimeBudget: undefined,
      urlType: 'lead_gen',
      url: '',
      primaryText: '',
      headline: '',
      description: '',
      mediaType: 'single_image',
      callToAction: 'LEARN_MORE',
      conversionLocation: 'website',
      schedule: undefined,
      targeting: {
        locations: {
          countries: ['US'],
          states: [],
          cities: [],
        },
        ageMin: 18,
        ageMax: 65,
      },
      placements: {
        facebook: ['feed', 'story'],
        instagram: ['stream', 'story'],
        audience_network: ['classic'],
        messenger: ['messenger_home']
      },
      selectedPageId: '', // Will be set from currentResources
    },
  });

  const watchUrl = watch('url');
  
  // Handle import token from Ad Scraper and check for Ad Scraper data
  useEffect(() => {
    const importToken = searchParams.get('importToken');
    const prefillId = searchParams.get('prefill');
    
    if (importToken) {
      // Handle direct import with token
      handleImportToken(importToken);
    } else if (prefillId) {
      // Handle prefill from stored variation
      loadPrefillData(prefillId);
    } else {
      // Check for Ad Scraper import data (localStorage and URL params)
      checkForImportedAd();
    }
  }, [searchParams]);
  
  const handleImportToken = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/variations/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ exportToken: token })
      });
      
      const data = await response.json();
      
      if (data.success && data.variation) {
        // Prefill form with variation data
        prefillFormWithVariation(data.variation);
        setImportMessage('Ad variation imported successfully!');
      } else {
        setImportMessage('Failed to import variation: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportMessage('Failed to import variation');
    } finally {
      setLoading(false);
    }
  };
  
  const loadPrefillData = async (variationId: string) => {
    try {
      const response = await fetch(`/api/variations/prefill/${variationId}`);
      const data = await response.json();
      
      if (data.success && data.prefillData) {
        prefillFormWithVariation(data.prefillData);
        setImportMessage('Form pre-filled with variation data');
      }
    } catch (error) {
      console.error('Prefill error:', error);
    }
  };
  
  const prefillFormWithVariation = (variation: any) => {
    // Prefill text fields
    if (variation.headline) setValue('headline', variation.headline);
    if (variation.description) setValue('description', variation.description);
    if (variation.primaryText) setValue('primaryText', variation.primaryText);
    if (variation.mediaType) {
      setValue('mediaType', variation.mediaType);
      setMediaType(variation.mediaType);
    }
    if (variation.callToAction) setValue('callToAction', variation.callToAction);
    
    // Handle image URLs - may need to download or reference them
    // This is a simplified version - you might need more complex handling
    if (variation.imageUrl) {
      // Store the image URL for display
      // In production, you might want to download and convert to File
      handleImportedImage(variation.imageUrl);
    }
  };
  
  // Load current resources on component mount
  useEffect(() => {
    const loadResources = async () => {
      try {
        const resources = await getCurrentResources();
        setCurrentResources(resources);
        // Update form with current page ID
        if (resources.pageId) {
          setValue('selectedPageId', resources.pageId);
        }
      } catch (error) {
        console.error('Failed to load current resources:', error);
        // Fallback to environment variables
        setValue('selectedPageId', process.env.REACT_APP_FB_PAGE_ID);
      }
    };
    loadResources();
  }, [setValue]);

  // Ad Scraper Integration Functions
  const checkForImportedAd = async () => {
    console.log('🔍 Checking for imported ad data...');
    
    let adData = null;
    let importSource = null;
    
    // Method 1: Check LocalStorage (Primary - most reliable)
    try {
      const stored = localStorage.getItem('adScraperTransfer');
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Verify data freshness (5 minutes timeout)
        if (Date.now() - parsed.timestamp < 300000) {
          adData = parsed.ads?.[0]; // Take first ad
          importSource = 'localStorage';
          console.log('✅ Found ad data in localStorage');
          
          // Clear after successful read (one-time use)
          localStorage.removeItem('adScraperTransfer');
        } else {
          console.log('⏰ LocalStorage data expired (older than 5 minutes)');
          localStorage.removeItem('adScraperTransfer');
        }
      }
    } catch (e) {
      console.log('No valid localStorage data found');
    }
    
    // Method 2: Check URL Parameters (Fallback)
    if (!adData) {
      const params = new URLSearchParams(window.location.search);
      
      if (params.get('source') === 'ad_scraper') {
        // Reconstruct ad data from shortened URL params
        adData = {
          headline: params.get('h') || '',
          primaryText: params.get('p') || '',
          description: params.get('d') || '',
          callToAction: params.get('c') || 'LEARN_MORE',
          imageUrl: decodeURIComponent(params.get('i') || '')
        };
        
        // Verify timestamp if present
        const timestamp = params.get('t');
        if (timestamp && Date.now() - parseInt(timestamp) < 300000) {
          importSource = 'url';
          console.log('✅ Found ad data in URL parameters');
        } else if (!timestamp) {
          // Accept without timestamp for backward compatibility
          importSource = 'url';
          console.log('✅ Found ad data in URL (no timestamp)');
        }
        
        // Clean URL without page reload
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    }
    
    // Method 3: Apply imported data to form
    if (adData && importSource) {
      console.log('📝 Applying imported ad data from:', importSource);
      applyImportedData(adData, importSource);
    } else {
      console.log('No ad import data found');
    }
  };

  const applyImportedData = (adData: any, source: string) => {
    try {
      // Apply text fields using React Hook Form setValue
      if (adData.headline) {
        setValue('headline', adData.headline);
        console.log('Set headline:', adData.headline);
      }
      
      if (adData.primaryText) {
        setValue('primaryText', adData.primaryText);
        console.log('Set primaryText:', adData.primaryText);
      }
      
      if (adData.description) {
        setValue('description', adData.description);
        console.log('Set description:', adData.description);
      }
      
      if (adData.callToAction) {
        setValue('callToAction', adData.callToAction);
        console.log('Set callToAction:', adData.callToAction);
      }
      
      // Handle image URL
      if (adData.imageUrl) {
        handleImportedImage(adData.imageUrl);
      }
      
      // Show success notification
      toast.success(`✅ Ad imported successfully from Ad Scraper (via ${source})`, {
        position: 'top-center',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
      
      // Visual feedback - highlight imported fields
      highlightImportedFields();
      
      // Log for debugging
      console.log('✅ Ad data applied successfully:', adData);
      
    } catch (error) {
      console.error('Error applying imported data:', error);
      toast.error('Failed to import some fields. Please check the data.');
    }
  };

  const handleImportedImage = (imageUrl: string) => {
    // Store the image URL for later use
    setImportedImageUrl(imageUrl);
    
    // Show image preview
    setImagePreview(imageUrl);
    
    console.log('Set image URL:', imageUrl);
  };

  const highlightImportedFields = () => {
    const fields = ['headline', 'primaryText', 'description', 'callToAction'];
    
    fields.forEach(fieldName => {
      setTimeout(() => {
        const field = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;
        if (field) {
          // Add highlight
          field.style.transition = 'all 0.3s ease';
          field.style.border = '2px solid #10b981';
          field.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            field.style.border = '';
            field.style.boxShadow = '';
          }, 3000);
        }
      }, 100); // Small delay to ensure DOM is ready
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      toast.success(`Image "${file.name}" selected`);
    }
  };

  const handleCarouselUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      if (files.length < 2) {
        toast.error('Carousel requires at least 2 images');
        return;
      }
      if (files.length > 10) {
        toast.error('Maximum 10 images allowed for carousel');
        return;
      }
      setCarouselImages(files);
      toast.success(`${files.length} images selected for carousel`);
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const maxSize = 4 * 1024 * 1024 * 1024; // 4GB
      if (file.size > maxSize) {
        toast.error('Video file size must be less than 4GB');
        return;
      }
      setVideoFile(file);
      toast.success(`Video "${file.name}" selected`);
    }
  };

  const fetchLinkPreview = React.useCallback(async (url: string) => {
    if (!url || !url.match(/^https?:\/\/.+/)) return;
    
    try {
      const response = await campaignApi.fetchLinkPreview(url);
      if (response.success && response.data) {
        setLinkPreview(response.data);
        // Auto-fill fields if empty
        if (!watch('headline')) setValue('headline', response.data.title);
        if (!watch('description')) setValue('description', response.data.description);
      }
    } catch (error) {
      console.error('Failed to fetch link preview:', error);
    }
  }, [setValue, watch]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (watchUrl) {
        fetchLinkPreview(watchUrl);
      }
    }, 1000); // Debounce

    return () => clearTimeout(timer);
  }, [watchUrl, fetchLinkPreview]);

  const addVariation = () => {
    setVariations([
      ...variations,
      {
        headline: '',
        description: '',
        primaryText: '',
        url: '',
        mediaType: 'single_image',
        callToAction: 'LEARN_MORE',
      },
    ]);
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, field: keyof AdVariation, value: any) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    setVariations(updated);
  };

  const handleVariationImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateVariation(index, 'image', file);
      toast.success(`Image selected for variation ${index + 1}`);
    }
  };

  const handleVariationVideoUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateVariation(index, 'video', file);
      toast.success(`Video selected for variation ${index + 1}`);
    }
  };

  const handleVariationCarouselUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length >= 2 && files.length <= 10) {
      updateVariation(index, 'images', files);
      toast.success(`${files.length} images selected for variation ${index + 1}`);
    } else {
      toast.error('Carousel requires 2-10 images');
    }
  };

  const onSubmit = async (data: CampaignFormData) => {
    setLoading(true);
    try {
      // Budget validation
      if (budgetType === 'daily' && (!data.dailyBudget || data.dailyBudget < 1)) {
        toast.error('Daily budget must be at least $1');
        setLoading(false);
        return;
      }
      if (budgetType === 'lifetime' && (!data.lifetimeBudget || data.lifetimeBudget < 1)) {
        toast.error('Lifetime budget must be at least $1');
        setLoading(false);
        return;
      }
      if (budgetType === 'lifetime' && !data.schedule?.endTime) {
        toast.error('Lifetime budget requires an end date');
        setLoading(false);
        return;
      }

      // Handle imported image from Ad Scraper using backend proxy
      let processedImageFile = imageFile;
      if (importedImageUrl && !imageFile && mediaType === 'single_image') {
        try {
          console.log('📥 Downloading imported image via backend proxy from:', importedImageUrl);
          
          // Use backend proxy to download image (bypasses CSP restrictions)
          const proxyResponse = await fetch('/api/images/proxy-download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({ imageUrl: importedImageUrl })
          });
          
          if (proxyResponse.ok) {
            const { imageData, contentType, originalSize } = await proxyResponse.json();
            console.log('📨 Received image data via proxy:', {
              contentType,
              originalSize,
              dataUrlLength: imageData.length
            });
            
            // Convert base64 data URL to File object (direct conversion - no CSP issues)
            const base64Data = imageData.split(',')[1]; // Remove "data:image/png;base64," prefix
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            
            // Convert binary string to byte array
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create blob from byte array
            const blob = new Blob([bytes], { type: contentType });
            
            // Extract file extension from content type
            const fileExtension = contentType.split('/')[1] || 'jpg';
            const fileName = `imported-image-${Date.now()}.${fileExtension}`;
            
            processedImageFile = new File([blob], fileName, { type: contentType });
            console.log('✅ Successfully downloaded and converted imported image:', {
              fileName,
              fileSize: blob.size,
              fileType: contentType,
              originalBase64Size: base64Data.length,
              convertedBlobSize: blob.size
            });
          } else {
            const errorData = await proxyResponse.json();
            console.error('❌ Backend proxy failed:', errorData);
            toast.error(`Failed to download image: ${errorData.error}`);
          }
        } catch (error) {
          console.error('Failed to download imported image via proxy:', error);
          toast.error('Failed to download imported image. Campaign will be created without image.');
        }
      }

      const campaignData = { 
        ...data, 
        budgetType,
        mediaType,
        image: mediaType === 'single_image' ? processedImageFile || undefined : undefined,
        images: mediaType === 'carousel' ? carouselImages : undefined,
        video: mediaType === 'single_video' ? videoFile || undefined : undefined,
        schedule: (scheduleEnabled || budgetType === 'lifetime') ? {
          ...data.schedule,
          dayparting: Object.keys(dayparting).length > 0 ? dayparting : undefined
        } : undefined,
        targeting: {
          locations: {
            countries: locationType === 'countries' ? selectedCountries : [],
            states: locationType === 'states' ? selectedStates : [],
            cities: locationType === 'cities' ? selectedCities : [],
            ...(locationType === 'custom' && customLocations ? { custom: customLocations.split(',').map(l => l.trim()) } : {}),
          },
          ageMin: ageRange[0],
          ageMax: ageRange[1],
        },
        placements: selectedPlacements,
      };

      let response;
      if (bulkMode && variations.length > 0) {
        response = await campaignApi.createBulkCampaign({
          ...campaignData,
          variations,
        });
      } else {
        response = await campaignApi.createCampaign(campaignData);
      }

      if (response.success) {
        toast.success(response.message || 'Campaign created successfully!');
        
        // Show additional info about the campaign
        if (response.data && response.data.campaign) {
          toast.info(`Campaign ID: ${response.data.campaign.id}`, {
            autoClose: 10000
          });
        }
        
        // Reset form
        reset();
        setVariations([]);
        setImageFile(null);
        setCarouselImages([]);
        setVideoFile(null);
        setLinkPreview(null);
        setScheduleEnabled(false);
        setBulkMode(false);
      } else {
        toast.error(response.error || 'Campaign creation failed');
      }
    } catch (error: any) {
      console.error('Campaign creation error:', error.response?.data);
      
      // Handle validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors;
        validationErrors.forEach((err: any) => {
          toast.error(`${err.path || err.param}: ${err.msg}`);
        });
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('An error occurred while creating the campaign');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!canCreateCampaign) {
    return (
      <Paper elevation={3} sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        <Alert severity="warning">
          You don't have permission to create campaigns. Please contact your administrator.
        </Alert>
      </Paper>
    );
  }

  return (
    <>
      {/* Import notification */}
      <Snackbar
        open={!!importMessage}
        autoHideDuration={6000}
        onClose={() => setImportMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setImportMessage(null)} 
          severity={importMessage?.includes('success') ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {importMessage}
        </Alert>
      </Snackbar>
      
      <Paper elevation={3} sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom color="primary">
          Facebook Campaign Launcher
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Alert severity="info" sx={{ flex: 1, mr: 2 }}>
          All campaigns will be created with [REVIEW] prefix in PAUSED status for your approval
        </Alert>
        
        {/* Ad Scraper import notification */}
        {(importedImageUrl || imagePreview) && (
          <Alert severity="info" sx={{ flex: 1, mr: 2 }}>
            <AlertTitle>Ad Imported from Ad Scraper</AlertTitle>
            Your ad creative has been imported successfully. Review and complete the remaining fields.
          </Alert>
        )}
        
        {user && (
          <Typography variant="body2" color="textSecondary">
            Logged in as: {user.firstName} {user.lastName}
          </Typography>
        )}
      </Box>
      
      {/* Show current resources being used */}
      {currentResources && (
        <Box sx={{ mb: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
            Using Resources:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {currentResources.adAccountId && (
              <Chip size="small" label={`Ad Account: ${currentResources.adAccountId}`} />
            )}
            {currentResources.pageId && (
              <Chip size="small" label={`Page: ${currentResources.pageId}`} />
            )}
            {currentResources.pixelId && (
              <Chip size="small" label={`Pixel: ${currentResources.pixelId}`} />
            )}
          </Box>
        </Box>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
              <Controller
                name="campaignName"
                control={control}
                rules={{ required: 'Campaign name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Campaign Name"
                    fullWidth
                    error={!!errors.campaignName}
                    helperText={errors.campaignName?.message}
                  />
                )}
              />
            </Box>

            <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
              {/* Budget Type Selection */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <AttachMoney sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  Budget Type
                </Typography>
                <RadioGroup
                  row
                  value={budgetType}
                  onChange={(e) => {
                    const newBudgetType = e.target.value as 'daily' | 'lifetime';
                    setBudgetType(newBudgetType);
                    // Automatically enable scheduling for lifetime budget
                    if (newBudgetType === 'lifetime') {
                      setScheduleEnabled(true);
                    }
                  }}
                >
                  <FormControlLabel value="daily" control={<Radio size="small" />} label="Daily Budget" />
                  <FormControlLabel value="lifetime" control={<Radio size="small" />} label="Lifetime Budget" />
                </RadioGroup>
              </FormControl>
              
              {budgetType === 'daily' ? (
                <Controller
                  name="dailyBudget"
                  control={control}
                  rules={{
                    required: 'Daily budget is required',
                    min: { value: 1, message: 'Minimum daily budget is $1' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Daily Budget"
                      type="number"
                      fullWidth
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      error={!!errors.dailyBudget}
                      helperText={errors.dailyBudget?.message}
                    />
                  )}
                />
              ) : (
                <Controller
                  name="lifetimeBudget"
                  control={control}
                  rules={{
                    required: 'Lifetime budget is required',
                    min: { value: 1, message: 'Minimum lifetime budget is $1' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Lifetime Budget"
                      type="number"
                      fullWidth
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      error={!!errors.lifetimeBudget}
                      helperText={errors.lifetimeBudget?.message || 'Requires end date in schedule'}
                    />
                  )}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
              <Controller
                name="urlType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>URL Type</InputLabel>
                    <Select {...field} label="URL Type">
                      <MenuItem value="lead_gen">Lead Generation (Redirect)</MenuItem>
                      <MenuItem value="call">Call (Lander)</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Box>

            <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
              <Controller
                name="url"
                control={control}
                rules={{ 
                  required: 'URL is required',
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Please enter a valid URL',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Website URL"
                    fullWidth
                    placeholder="https://example.com"
                    error={!!errors.url}
                    helperText={errors.url?.message}
                  />
                )}
              />
            </Box>
          </Box>

          <Box>
            <Controller
              name="headline"
              control={control}
              rules={{ required: 'Headline is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Headline"
                  fullWidth
                  error={!!errors.headline}
                  helperText={errors.headline?.message}
                />
              )}
            />
          </Box>

          <Box>
            <Controller
              name="description"
              control={control}
              rules={{ required: 'Description is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />
          </Box>

          <Box>
            <Controller
              name="primaryText"
              control={control}
              rules={{ required: 'Primary text is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Primary Text"
                  fullWidth
                  multiline
                  rows={4}
                  error={!!errors.primaryText}
                  helperText={errors.primaryText?.message || 'This is the main text of your ad'}
                />
              )}
            />
          </Box>

          {/* Media Type Selection */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Media Type
            </Typography>
            <ToggleButtonGroup
              value={mediaType}
              exclusive
              onChange={(_, value) => value && setMediaType(value)}
              fullWidth
            >
              <ToggleButton value="single_image">
                <Image sx={{ mr: 1 }} /> Single Image
              </ToggleButton>
              <ToggleButton value="carousel">
                <ViewCarousel sx={{ mr: 1 }} /> Carousel
              </ToggleButton>
              <ToggleButton value="video">
                <VideoLibrary sx={{ mr: 1 }} /> Video
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Imported Image Preview - positioned near Media Type */}
          {(importedImageUrl || imagePreview) && imagePreview && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                📥 Imported Image Preview
              </Typography>
              <Box sx={{ 
                p: 2, 
                border: '2px dashed #0ea5e9', 
                borderRadius: 2, 
                backgroundColor: '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <img 
                  src={imagePreview} 
                  alt="Imported ad" 
                  style={{ 
                    maxWidth: '150px', 
                    maxHeight: '100px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #0ea5e9'
                  }} 
                />
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    This image was imported from Ad Scraper and will be used for your campaign.
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'primary.main' }}>
                    You can still upload a different image below if needed.
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Media Upload based on type */}
          <Box>
            {mediaType === 'single_image' && (
              <>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                >
                  Upload Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
                {imageFile && (
                  <Chip
                    label={imageFile.name}
                    onDelete={() => setImageFile(null)}
                    sx={{ mt: 1 }}
                  />
                )}
              </>
            )}

            {mediaType === 'carousel' && (
              <>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                >
                  Upload Carousel Images (2-10)
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    multiple
                    onChange={handleCarouselUpload}
                  />
                </Button>
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {carouselImages.map((file, idx) => (
                    <Chip
                      key={idx}
                      label={`${idx + 1}. ${file.name}`}
                      onDelete={() => {
                        setCarouselImages(carouselImages.filter((_, i) => i !== idx));
                      }}
                    />
                  ))}
                </Box>
              </>
            )}

            {mediaType === 'single_video' && (
              <>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                >
                  Upload Video (Max 4GB)
                  <input
                    type="file"
                    hidden
                    accept="video/*"
                    onChange={handleVideoUpload}
                  />
                </Button>
                {videoFile && (
                  <Chip
                    label={videoFile.name}
                    onDelete={() => setVideoFile(null)}
                    sx={{ mt: 1 }}
                  />
                )}
              </>
            )}
          </Box>

          {/* Call to Action */}
          <Box>
            <Controller
              name="callToAction"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Call to Action</InputLabel>
                  <Select {...field} label="Call to Action">
                    {CALL_TO_ACTION_OPTIONS.map(cta => (
                      <MenuItem key={cta} value={cta}>
                        {cta.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Box>

          {/* Conversion Location */}
          <Box>
            <Controller
              name="conversionLocation"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Conversion Location</InputLabel>
                  <Select {...field} label="Conversion Location">
                    <MenuItem value="website">Website</MenuItem>
                    <MenuItem value="calls">Calls</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Box>

          {/* Targeting Section */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">
                <LocationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
                Targeting
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Location Targeting */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Location Targeting
                  </Typography>
                  <Tabs 
                    value={locationType} 
                    onChange={(_, value) => setLocationType(value)}
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Tab label="Countries" value="countries" />
                    <Tab label="States" value="states" />
                    <Tab label="Cities" value="cities" />
                    <Tab label="Custom" value="custom" />
                  </Tabs>
                  
                  {/* Countries Tab */}
                  {locationType === 'countries' && (
                    <Autocomplete
                      multiple
                      options={COUNTRIES}
                      getOptionLabel={(option) => option.name}
                      value={COUNTRIES.filter(c => selectedCountries.includes(c.code))}
                      onChange={(_, values) => {
                        setSelectedCountries(values.map(v => v.code));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder="Select countries"
                          helperText="Target entire countries"
                        />
                      )}
                    />
                  )}
                  
                  {/* States Tab */}
                  {locationType === 'states' && (
                    <>
                      {selectedCountries.includes('US') ? (
                        <Autocomplete
                          multiple
                          options={US_STATES}
                          getOptionLabel={(option) => option.name}
                          value={US_STATES.filter(s => selectedStates.includes(s.code))}
                          onChange={(_, values) => {
                            setSelectedStates(values.map(v => v.code));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              placeholder="Select US states"
                              helperText="Target specific US states"
                            />
                          )}
                        />
                      ) : (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          Please select United States in the Countries tab first
                        </Alert>
                      )}
                    </>
                  )}
                  
                  {/* Cities Tab */}
                  {locationType === 'cities' && (
                    <>
                      {selectedCountries.includes('US') ? (
                        <Autocomplete
                          multiple
                          options={US_CITIES}
                          getOptionLabel={(option) => option.name}
                          value={US_CITIES.filter(c => selectedCities.includes(c.key))}
                          onChange={(_, values) => {
                            setSelectedCities(values.map(v => v.key));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              placeholder="Select US cities"
                              helperText="Target major US cities"
                            />
                          )}
                        />
                      ) : (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          Please select United States in the Countries tab first
                        </Alert>
                      )}
                    </>
                  )}
                  
                  {/* Custom Locations Tab */}
                  {locationType === 'custom' && (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={customLocations}
                      onChange={(e) => setCustomLocations(e.target.value)}
                      placeholder="Enter custom locations (comma-separated)\nExample: 90210, Beverly Hills, CA"
                      helperText="Enter ZIP codes, city names, or addresses separated by commas"
                    />
                  )}
                  
                  {/* Display selected locations summary */}
                  <Box sx={{ mt: 2 }}>
                    {locationType === 'countries' && selectedCountries.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Targeting {selectedCountries.length} country(ies): {selectedCountries.join(', ')}
                      </Typography>
                    )}
                    {locationType === 'states' && selectedStates.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Targeting {selectedStates.length} US state(s)
                      </Typography>
                    )}
                    {locationType === 'cities' && selectedCities.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Targeting {selectedCities.length} US city(ies)
                      </Typography>
                    )}
                    {locationType === 'custom' && customLocations && (
                      <Typography variant="caption" color="text.secondary">
                        Custom locations: {customLocations.split(',').length} location(s)
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Age Range */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    <People sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    Age Range: {ageRange[0]} - {ageRange[1]}
                  </Typography>
                  <Slider
                    value={ageRange}
                    onChange={(_, value) => setAgeRange(value as number[])}
                    valueLabelDisplay="auto"
                    min={13}
                    max={65}
                    marks={[
                      { value: 13, label: '13' },
                      { value: 18, label: '18' },
                      { value: 25, label: '25' },
                      { value: 35, label: '35' },
                      { value: 45, label: '45' },
                      { value: 55, label: '55' },
                      { value: 65, label: '65+' },
                    ]}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Placements Section */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">
                <Devices sx={{ mr: 1, verticalAlign: 'middle' }} />
                Placements
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Facebook Placements */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Facebook</Typography>
                  <FormGroup row>
                    {PLACEMENT_OPTIONS.facebook.map(placement => (
                      <FormControlLabel
                        key={placement.value}
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedPlacements.facebook.includes(placement.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPlacements(prev => ({
                                  ...prev,
                                  facebook: [...prev.facebook, placement.value]
                                }));
                              } else {
                                setSelectedPlacements(prev => ({
                                  ...prev,
                                  facebook: prev.facebook.filter(p => p !== placement.value)
                                }));
                              }
                            }}
                          />
                        }
                        label={placement.label}
                      />
                    ))}
                  </FormGroup>
                </Box>

                {/* Instagram Placements */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Instagram</Typography>
                  <FormGroup row>
                    {PLACEMENT_OPTIONS.instagram.map(placement => (
                      <FormControlLabel
                        key={placement.value}
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedPlacements.instagram.includes(placement.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPlacements(prev => ({
                                  ...prev,
                                  instagram: [...prev.instagram, placement.value]
                                }));
                              } else {
                                setSelectedPlacements(prev => ({
                                  ...prev,
                                  instagram: prev.instagram.filter(p => p !== placement.value)
                                }));
                              }
                            }}
                          />
                        }
                        label={placement.label}
                      />
                    ))}
                  </FormGroup>
                </Box>

                {/* Audience Network Placements */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Audience Network</Typography>
                  <FormGroup row>
                    {PLACEMENT_OPTIONS.audience_network.map(placement => (
                      <FormControlLabel
                        key={placement.value}
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedPlacements.audience_network.includes(placement.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPlacements(prev => ({
                                  ...prev,
                                  audience_network: [...prev.audience_network, placement.value]
                                }));
                              } else {
                                setSelectedPlacements(prev => ({
                                  ...prev,
                                  audience_network: prev.audience_network.filter(p => p !== placement.value)
                                }));
                              }
                            }}
                          />
                        }
                        label={placement.label}
                      />
                    ))}
                  </FormGroup>
                </Box>

                {/* Messenger Placements */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Messenger</Typography>
                  <FormGroup row>
                    {PLACEMENT_OPTIONS.messenger.map(placement => (
                      <FormControlLabel
                        key={placement.value}
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedPlacements.messenger.includes(placement.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPlacements(prev => ({
                                  ...prev,
                                  messenger: [...prev.messenger, placement.value]
                                }));
                              } else {
                                setSelectedPlacements(prev => ({
                                  ...prev,
                                  messenger: prev.messenger.filter(p => p !== placement.value)
                                }));
                              }
                            }}
                          />
                        }
                        label={placement.label}
                      />
                    ))}
                  </FormGroup>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Link Preview */}
          {linkPreview && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Link Preview
              </Typography>
              <Card>
                {linkPreview.image && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={linkPreview.image}
                    alt="Link preview"
                  />
                )}
                <CardContent>
                  <Typography variant="h6">{linkPreview.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {linkPreview.description}
                  </Typography>
                  {linkPreview.siteName && (
                    <Typography variant="caption" color="text.secondary">
                      {linkPreview.siteName}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Schedule & Advanced Dayparting */}
          <Paper sx={{ p: 3, backgroundColor: 'background.paper', border: '2px solid', borderColor: budgetType === 'lifetime' ? 'primary.main' : 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
              <Typography variant="h5" sx={{ fontWeight: 'medium' }}>Campaign Schedule & Advanced Dayparting</Typography>
              {budgetType === 'daily' && (
                <Button
                  size="small"
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  sx={{ ml: 'auto' }}
                  variant={scheduleEnabled ? 'contained' : 'outlined'}
                  color="primary"
                >
                  {scheduleEnabled ? '✓ Scheduling Enabled' : 'Enable Scheduling'}
                </Button>
              )}
              {budgetType === 'lifetime' && (
                <Chip 
                  label="Required for Lifetime Budget" 
                  color="primary" 
                  size="medium" 
                  sx={{ ml: 'auto' }}
                />
              )}
            </Box>
            
            {budgetType === 'lifetime' && !scheduleEnabled && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Lifetime budget campaigns require scheduling. Set your campaign dates and optionally configure dayparting to run ads only during specific hours.
              </Alert>
            )}
            
            {(scheduleEnabled || budgetType === 'lifetime') && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
                    <Controller
                      name="schedule.startTime"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Start Time"
                          type="datetime-local"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          required={budgetType === 'lifetime'}
                        />
                      )}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
                    <Controller
                      name="schedule.endTime"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label={budgetType === 'lifetime' ? 'End Time (Required)' : 'End Time (Optional)'}
                          type="datetime-local"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          required={budgetType === 'lifetime'}
                        />
                      )}
                    />
                  </Box>
                </Box>
                
                {/* Dayparting Schedule */}
                <Box>
                  <DaypartingSchedule
                    value={dayparting}
                    onChange={(newSchedule) => {
                      setDayparting(newSchedule);
                      setValue('schedule.dayparting', newSchedule);
                    }}
                  />
                </Box>
              </Box>
            )}
          </Paper>

          <Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => setBulkMode(!bulkMode)}
                startIcon={<Add />}
              >
                {bulkMode ? 'Single Ad Mode' : 'Bulk Variations Mode'}
              </Button>
              {bulkMode && (
                <Typography variant="body2" color="text.secondary">
                  Add multiple ad variations under the same campaign
                </Typography>
              )}
            </Box>
          </Box>

          {bulkMode && (
            <Box>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Ad Variations</Typography>
                  <Button onClick={addVariation} startIcon={<Add />}>
                    Add Variation
                  </Button>
                </Box>
                
                {variations.map((variation, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle1">Variation {index + 1}</Typography>
                      <IconButton onClick={() => removeVariation(index)} size="small">
                        <Delete />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Headline"
                        fullWidth
                        value={variation.headline}
                        onChange={(e) => updateVariation(index, 'headline', e.target.value)}
                      />
                      <TextField
                        label="Description"
                        fullWidth
                        value={variation.description}
                        onChange={(e) => updateVariation(index, 'description', e.target.value)}
                      />
                      <TextField
                        label="Primary Text"
                        fullWidth
                        multiline
                        rows={3}
                        value={variation.primaryText}
                        onChange={(e) => updateVariation(index, 'primaryText', e.target.value)}
                      />
                      
                      {/* Media Type for Variation */}
                      <FormControl fullWidth size="small">
                        <InputLabel>Media Type</InputLabel>
                        <Select
                          value={variation.mediaType || 'single_image'}
                          onChange={(e) => updateVariation(index, 'mediaType', e.target.value)}
                          label="Media Type"
                        >
                          <MenuItem value="single_image">Single Image</MenuItem>
                          <MenuItem value="carousel">Carousel</MenuItem>
                          <MenuItem value="video">Video</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Media Upload for Variation */}
                      {variation.mediaType === 'single_image' && (
                        <Button
                          variant="outlined"
                          component="label"
                          size="small"
                          startIcon={<CloudUpload />}
                        >
                          Upload Image
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => handleVariationImageUpload(index, e)}
                          />
                        </Button>
                      )}
                      
                      {variation.mediaType === 'carousel' && (
                        <Button
                          variant="outlined"
                          component="label"
                          size="small"
                          startIcon={<CloudUpload />}
                        >
                          Upload Carousel Images
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            multiple
                            onChange={(e) => handleVariationCarouselUpload(index, e)}
                          />
                        </Button>
                      )}
                      
                      {variation.mediaType === 'single_video' && (
                        <Button
                          variant="outlined"
                          component="label"
                          size="small"
                          startIcon={<CloudUpload />}
                        >
                          Upload Video
                          <input
                            type="file"
                            hidden
                            accept="video/*"
                            onChange={(e) => handleVariationVideoUpload(index, e)}
                          />
                        </Button>
                      )}

                      {variation.image && (
                        <Chip 
                          label={variation.image.name} 
                          size="small"
                          onDelete={() => updateVariation(index, 'image', null)}
                        />
                      )}
                      {variation.images && variation.images.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {variation.images.map((img, idx) => (
                            <Chip key={idx} label={`${idx + 1}. ${img.name}`} size="small" />
                          ))}
                        </Box>
                      )}
                      {variation.video && (
                        <Chip 
                          label={variation.video.name} 
                          size="small"
                          onDelete={() => updateVariation(index, 'video', null)}
                        />
                      )}

                      {/* Call to Action for Variation */}
                      <FormControl fullWidth size="small">
                        <InputLabel>Call to Action</InputLabel>
                        <Select
                          value={variation.callToAction || 'LEARN_MORE'}
                          onChange={(e) => updateVariation(index, 'callToAction', e.target.value)}
                          label="Call to Action"
                        >
                          {CALL_TO_ACTION_OPTIONS.map(cta => (
                            <MenuItem key={cta} value={cta}>
                              {cta.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Paper>
                ))}
              </Paper>
            </Box>
          )}

          <Box>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Campaign'}
            </Button>
          </Box>
        </Box>
      </form>
    </Paper>
    </>
  );
};

export default CampaignForm;