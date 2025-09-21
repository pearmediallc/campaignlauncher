// Complete Meta Ads Manager Field Types for Strategy 1-50-1
// This file contains ALL fields available in Meta Ads Manager

import { CampaignFormData } from './campaign';

// ==================== CAMPAIGN LEVEL ====================

export const CAMPAIGN_OBJECTIVES = [
  // Awareness
  { value: 'BRAND_AWARENESS', label: 'Brand awareness' },
  { value: 'REACH', label: 'Reach' },
  { value: 'VIDEO_VIEWS', label: 'Video views' },
  { value: 'STORE_LOCATION_AWARENESS', label: 'Store location awareness' },

  // Traffic
  { value: 'LINK_CLICKS', label: 'Traffic' },

  // Engagement
  { value: 'POST_ENGAGEMENT', label: 'Engagement' },
  { value: 'PAGE_LIKES', label: 'Page likes' },
  { value: 'EVENT_RESPONSES', label: 'Event responses' },
  { value: 'MESSAGES', label: 'Messages' },

  // Leads
  { value: 'LEAD_GENERATION', label: 'Lead generation' },

  // App promotion
  { value: 'APP_INSTALLS', label: 'App installs' },

  // Sales
  { value: 'CONVERSIONS', label: 'Conversions' },
  { value: 'PRODUCT_CATALOG_SALES', label: 'Catalog sales' },
  { value: 'STORE_VISITS', label: 'Store traffic' },

  // Default for Strategy 1-50-1
  { value: 'OUTCOME_LEADS', label: 'Leads (Outcome-driven)' },
  { value: 'OUTCOME_SALES', label: 'Sales (Outcome-driven)' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic (Outcome-driven)' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement (Outcome-driven)' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App promotion (Outcome-driven)' },
  { value: 'OUTCOME_AWARENESS', label: 'Awareness (Outcome-driven)' }
];

export const BUYING_TYPES = [
  { value: 'AUCTION', label: 'Auction', default: true },
  { value: 'RESERVED', label: 'Reach and frequency' }
];

export const CAMPAIGN_BID_STRATEGIES = [
  { value: 'LOWEST_COST', label: 'Lowest cost (Maximize delivery)' },
  { value: 'HIGHEST_VALUE', label: 'Highest value (Maximize value)' },
  { value: 'COST_CAP', label: 'Cost cap (Cost per result goal)' },
  { value: 'BID_CAP', label: 'Bid cap (Bid control)' },
  { value: 'MINIMUM_ROAS', label: 'Minimum ROAS (Return on ad spend control)' },
  { value: 'TARGET_COST', label: 'Target cost (Deprecated)' }
];

export const SPECIAL_AD_CATEGORIES = [
  { value: 'NONE', label: 'None' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'SOCIAL_ISSUES', label: 'Social issues, elections or politics' },
  { value: 'ONLINE_GAMBLING_AND_GAMING', label: 'Online gambling and gaming' }
];

// ==================== AD SET LEVEL ====================

// Budget & Schedule
export const ADSET_OPTIMIZATION_GOALS = [
  // Conversions
  { value: 'OFFSITE_CONVERSIONS', label: 'Conversions' },
  { value: 'LEAD_GENERATION', label: 'Leads' },
  { value: 'LINK_CLICKS', label: 'Link clicks' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Landing page views' },

  // Awareness
  { value: 'REACH', label: 'Reach' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'AD_RECALL_LIFT', label: 'Ad recall lift' },
  { value: 'BRAND_AWARENESS', label: 'Brand awareness' },

  // Engagement
  { value: 'POST_ENGAGEMENT', label: 'Post engagement' },
  { value: 'PAGE_LIKES', label: 'Page likes' },
  { value: 'EVENT_RESPONSES', label: 'Event responses' },
  { value: 'CONVERSATIONS', label: 'Conversations' },

  // Video
  { value: 'THRUPLAY', label: 'ThruPlay' },
  { value: 'VIDEO_VIEWS', label: '2-second continuous video views' },

  // App
  { value: 'APP_INSTALLS', label: 'App installs' },
  { value: 'IN_APP_VALUE', label: 'App events' },

  // Catalog
  { value: 'VALUE', label: 'Value' },
  { value: 'DERIVED_EVENTS', label: 'Complete payment' },

  // Calls
  { value: 'QUALITY_CALL', label: 'Quality calls' },

  // Messages
  { value: 'QUALITY_LEAD', label: 'Quality leads' },
  { value: 'ENGAGED_USERS', label: 'Messaging conversations started' },

  // Other
  { value: 'VISIT_INSTAGRAM_PROFILE', label: 'Instagram profile visits' },
  { value: 'NONE', label: 'None' }
];

export const BILLING_EVENTS = [
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'LINK_CLICKS', label: 'Link clicks' },
  { value: 'THRUPLAY', label: 'ThruPlay' },
  { value: 'POST_ENGAGEMENT', label: 'Post engagement' },
  { value: 'PAGE_LIKES', label: 'Page likes' },
  { value: 'APP_INSTALLS', label: 'App installs' },
  { value: 'VIDEO_VIEWS', label: 'Video views' },
  { value: 'LISTING_INTERACTION', label: 'Listing interaction' }
];

// Audience Targeting
export const AUDIENCE_LOCATIONS = {
  locationType: [
    { value: 'home', label: 'People living in this location' },
    { value: 'recent', label: 'People recently in this location' },
    { value: 'travel_in', label: 'People traveling in this location' }
  ],
  worldwide: { value: 'WORLDWIDE', label: 'Worldwide' }
};

export const AUDIENCE_AGE_RANGE = {
  min: 13,
  max: 65 // 65+ is represented as 65
};

export const AUDIENCE_GENDERS = [
  { value: 'ALL', label: 'All genders' },
  { value: 'MALE', label: 'Men' },
  { value: 'FEMALE', label: 'Women' }
];

export const AUDIENCE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ru', label: 'Russian' }
  // Add more as needed
];

// Placements
export const PLACEMENT_PLATFORMS = {
  automatic: { value: 'automatic', label: 'Advantage+ placements (Recommended)' },
  manual: {
    facebook: {
      label: 'Facebook',
      positions: [
        { value: 'feed', label: 'Facebook Feed' },
        { value: 'right_hand_column', label: 'Facebook Right Column' },
        { value: 'instant_article', label: 'Facebook Instant Articles' },
        { value: 'marketplace', label: 'Facebook Marketplace' },
        { value: 'video_feeds', label: 'Facebook Video Feeds' },
        { value: 'stories', label: 'Facebook Stories' },
        { value: 'search', label: 'Facebook Search Results' },
        { value: 'reels', label: 'Facebook Reels' },
        { value: 'in_stream', label: 'Facebook In-Stream Videos' },
        { value: 'shops', label: 'Facebook Shops' }
      ]
    },
    instagram: {
      label: 'Instagram',
      positions: [
        { value: 'stream', label: 'Instagram Feed' },
        { value: 'stories', label: 'Instagram Stories' },
        { value: 'explore', label: 'Instagram Explore' },
        { value: 'reels', label: 'Instagram Reels' },
        { value: 'profile_feed', label: 'Instagram Profile Feed' },
        { value: 'search', label: 'Instagram Search Results' },
        { value: 'shops', label: 'Instagram Shops' },
        { value: 'igtv', label: 'Instagram IGTV' }
      ]
    },
    audience_network: {
      label: 'Audience Network',
      positions: [
        { value: 'classic', label: 'Audience Network Native, Banner and Interstitial' },
        { value: 'instream_video', label: 'Audience Network In-Stream Videos' },
        { value: 'rewarded_video', label: 'Audience Network Rewarded Videos' }
      ]
    },
    messenger: {
      label: 'Messenger',
      positions: [
        { value: 'messenger_home', label: 'Messenger Inbox' },
        { value: 'sponsored_messages', label: 'Messenger Sponsored Messages' },
        { value: 'stories', label: 'Messenger Stories' }
      ]
    },
    whatsapp: {
      label: 'WhatsApp',
      positions: [
        { value: 'status', label: 'WhatsApp Status' }
      ]
    }
  }
};

export const DEVICE_PLATFORMS = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'connected_tv', label: 'Connected TV' }
];

export const MOBILE_DEVICES = {
  all: { value: 'all_mobile', label: 'All Mobile Devices' },
  ios: [
    { value: 'iphone', label: 'iPhone' },
    { value: 'ipad', label: 'iPad' },
    { value: 'ipod', label: 'iPod' }
  ],
  android: [
    { value: 'android_smartphone', label: 'Android Smartphones' },
    { value: 'android_tablet', label: 'Android Tablets' },
    { value: 'android_tv', label: 'Android TV' }
  ],
  other: [
    { value: 'windows_phone', label: 'Windows Phone' },
    { value: 'feature_phone', label: 'Feature Phones' }
  ]
};

export const CONNECTION_TYPES = [
  { value: 'wifi', label: 'Wi-Fi only' },
  { value: '2g', label: '2G' },
  { value: '3g', label: '3G' },
  { value: '4g', label: '4G' },
  { value: '5g', label: '5G' }
];

// Pixel Events (renamed from Dataset)
export const PIXEL_STANDARD_EVENTS = [
  { value: 'PageView', label: 'PageView' },
  { value: 'ViewContent', label: 'ViewContent' },
  { value: 'Search', label: 'Search' },
  { value: 'AddToCart', label: 'AddToCart' },
  { value: 'AddToWishlist', label: 'AddToWishlist' },
  { value: 'InitiateCheckout', label: 'InitiateCheckout' },
  { value: 'AddPaymentInfo', label: 'AddPaymentInfo' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Lead', label: 'Lead' },
  { value: 'CompleteRegistration', label: 'CompleteRegistration' },
  { value: 'Contact', label: 'Contact' },
  { value: 'CustomizeProduct', label: 'CustomizeProduct' },
  { value: 'Donate', label: 'Donate' },
  { value: 'FindLocation', label: 'FindLocation' },
  { value: 'Schedule', label: 'Schedule' },
  { value: 'StartTrial', label: 'StartTrial' },
  { value: 'SubmitApplication', label: 'SubmitApplication' },
  { value: 'Subscribe', label: 'Subscribe' }
];

export const ATTRIBUTION_WINDOWS = {
  view: [
    { value: '1_DAY_VIEW', label: '1-day view' },
    { value: '7_DAY_VIEW', label: '7-day view' }
  ],
  click: [
    { value: '1_DAY_CLICK', label: '1-day click' },
    { value: '7_DAY_CLICK', label: '7-day click' },
    { value: '28_DAY_CLICK', label: '28-day click' }
  ],
  default: { value: '7_DAY_CLICK_1_DAY_VIEW', label: '7-day click and 1-day view' }
};

// ==================== AD LEVEL ====================

export const AD_FORMATS = [
  { value: 'SINGLE_IMAGE', label: 'Single image' },
  { value: 'SINGLE_VIDEO', label: 'Single video' },
  { value: 'CAROUSEL', label: 'Carousel' },
  { value: 'COLLECTION', label: 'Collection' },
  { value: 'SLIDESHOW', label: 'Slideshow' },
  { value: 'PLAYABLES', label: 'Playables' }
];

export const AD_CREATIVE_MEDIA_SPECS = {
  image: {
    formats: ['jpg', 'jpeg', 'png'],
    aspectRatios: [
      { value: '1:1', label: 'Square (1:1)' },
      { value: '4:5', label: 'Vertical (4:5)' },
      { value: '9:16', label: 'Stories (9:16)' },
      { value: '16:9', label: 'Landscape (16:9)' },
      { value: '1.91:1', label: 'Link (1.91:1)' }
    ],
    minWidth: 600,
    recommendedWidth: 1080,
    maxFileSize: '30MB'
  },
  video: {
    formats: ['mp4', 'mov', 'gif'],
    aspectRatios: [
      { value: '1:1', label: 'Square (1:1)' },
      { value: '4:5', label: 'Vertical (4:5)' },
      { value: '9:16', label: 'Stories (9:16)' },
      { value: '16:9', label: 'Landscape (16:9)' }
    ],
    duration: {
      min: 1,
      max: 241,
      recommended: { min: 15, max: 60 }
    },
    maxFileSize: '4GB',
    frameRate: { min: 23, max: 60 },
    resolution: {
      min: { width: 600, height: 315 },
      recommended: { width: 1080, height: 1080 }
    }
  },
  carousel: {
    minCards: 2,
    maxCards: 10,
    mediaTypes: ['image', 'video', 'mixed']
  }
};

export const AD_DESTINATION_TYPES = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'APP', label: 'App' },
  { value: 'MESSENGER', label: 'Messenger' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'INSTAGRAM_DIRECT', label: 'Instagram Direct' },
  { value: 'FACEBOOK_EVENT', label: 'Facebook Event' },
  { value: 'LEAD_FORM', label: 'Instant Form' },
  { value: 'CANVAS', label: 'Instant Experience' },
  { value: 'SHOP', label: 'Shop' },
  { value: 'NONE', label: 'None' }
];

export const AD_CTA_TYPES = [
  { value: 'NO_BUTTON', label: 'No Button' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'BOOK_NOW', label: 'Book Now' },
  { value: 'CALL', label: 'Call' },
  { value: 'CALL_ME', label: 'Call Me' },
  { value: 'CALL_NOW', label: 'Call Now' },
  { value: 'CONTACT', label: 'Contact' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'DONATE', label: 'Donate' },
  { value: 'DONATE_NOW', label: 'Donate Now' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'EVENT_RSVP', label: 'Event RSVP' },
  { value: 'FIND_A_GROUP', label: 'Find a Group' },
  { value: 'FIND_YOUR_GROUPS', label: 'Find Your Groups' },
  { value: 'FOLLOW_NEWS_STORYLINE', label: 'Follow News Storyline' },
  { value: 'FOLLOW_PAGE', label: 'Follow Page' },
  { value: 'FOLLOW_USER', label: 'Follow User' },
  { value: 'GET_DIRECTIONS', label: 'Get Directions' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'GET_OFFER_VIEW', label: 'Get Offer' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'GET_SHOWTIMES', label: 'Get Showtimes' },
  { value: 'GET_STARTED', label: 'Get Started' },
  { value: 'INSTALL_APP', label: 'Install App' },
  { value: 'INSTALL_MOBILE_APP', label: 'Install Mobile App' },
  { value: 'JOIN', label: 'Join' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'LIKE_PAGE', label: 'Like Page' },
  { value: 'LISTEN_MUSIC', label: 'Listen Music' },
  { value: 'LISTEN_NOW', label: 'Listen Now' },
  { value: 'MESSAGE_PAGE', label: 'Send Message' },
  { value: 'MOBILE_DOWNLOAD', label: 'Download' },
  { value: 'OPEN_LINK', label: 'Open Link' },
  { value: 'ORDER_NOW', label: 'Order Now' },
  { value: 'PAY_TO_ACCESS', label: 'Pay to Access' },
  { value: 'PLAY_GAME', label: 'Play Game' },
  { value: 'PLAY_GAME_ON_FACEBOOK', label: 'Play Game on Facebook' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'PURCHASE_GIFT_CARDS', label: 'Purchase Gift Cards' },
  { value: 'RAISE_MONEY', label: 'Raise Money' },
  { value: 'RECORD_NOW', label: 'Record Now' },
  { value: 'REFER_FRIENDS', label: 'Refer Friends' },
  { value: 'REQUEST_TIME', label: 'Request Time' },
  { value: 'SAY_THANKS', label: 'Say Thanks' },
  { value: 'SEE_MORE', label: 'See More' },
  { value: 'SELL_NOW', label: 'Sell Now' },
  { value: 'SEND_A_GIFT', label: 'Send a Gift' },
  { value: 'SEND_GIFT_MONEY', label: 'Send Gift Money' },
  { value: 'SEND_UPDATES', label: 'Send Updates' },
  { value: 'SHARE', label: 'Share' },
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'SOTTO_SUBSCRIBE', label: 'Subscribe' },
  { value: 'START_ORDER', label: 'Start Order' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'SWIPE_UP_PRODUCT', label: 'Swipe Up' },
  { value: 'SWIPE_UP_SHOP', label: 'Swipe Up' },
  { value: 'UPDATE_APP', label: 'Update App' },
  { value: 'USE_APP', label: 'Use App' },
  { value: 'USE_MOBILE_APP', label: 'Use Mobile App' },
  { value: 'VIDEO_ANNOTATION', label: 'Video Annotation' },
  { value: 'VIDEO_CALL', label: 'Video Call' },
  { value: 'VIEW_PRODUCT', label: 'View Product' },
  { value: 'WATCH', label: 'Watch' },
  { value: 'WATCH_MORE', label: 'Watch More' },
  { value: 'WATCH_VIDEO', label: 'Watch Video' },
  { value: 'WHATSAPP_LINK', label: 'WhatsApp' },
  { value: 'WHATSAPP_MESSAGE', label: 'Send WhatsApp Message' },
  { value: 'WOODHENGE_SUPPORT', label: 'Support' }
];

// ==================== ENHANCED FORM DATA INTERFACE ====================

export interface Strategy150EnhancedFormData extends Partial<CampaignFormData> {
  // Required fields from CampaignFormData
  campaignName?: string;
  primaryText?: string;
  headline?: string;
  description?: string;

  // Additional fields for component compatibility
  duplicateBudgets?: number[];
  roasGoal?: number;
  budgetLevel?: string;
  advantagePlusCampaign?: boolean;
  advantagePlusCreative?: boolean;
  pageId?: string;
  pixel?: string;
  placementType?: string;
  adFormat?: string;
  // Campaign Level
  buyingType: string;
  objective: string;
  campaignBudgetOptimization: boolean;
  campaignDailyBudget?: number;
  campaignLifetimeBudget?: number;
  campaignSpendingLimit?: number;
  specialAdCategories: string[];
  bidStrategy: string;
  aBTest?: boolean;

  // Ad Set Level - Budget & Schedule
  adSetBudgetType: 'daily' | 'lifetime';
  adSetDailyBudget?: number;
  adSetLifetimeBudget?: number;
  adSetSpendingLimit?: number;
  startDate?: string;
  endDate?: string;
  scheduleType: 'run_continuously' | 'set_schedule';
  dayparting?: {
    [key: string]: { start: number; end: number }[];
  };
  optimizationGoal: string;
  billingEvent: string;
  costPerResultGoal?: number;
  bidCap?: number;
  minimumRoas?: number;

  // Ad Set Level - Audience
  audienceLocations: {
    countries?: string[];
    regions?: string[];
    cities?: string[];
    zips?: string[];
    radius?: {
      latitude: number;
      longitude: number;
      radius: number;
      distanceUnit: 'mile' | 'kilometer';
    }[];
    locationType: string;
  };
  ageMin: number;
  ageMax: number;
  genders: string[];
  languages: string[];
  detailedTargeting?: {
    interests?: string[];
    behaviors?: string[];
    demographics?: string[];
    lifeEvents?: string[];
    industries?: string[];
    jobTitles?: string[];
    employers?: string[];
    educationLevel?: string[];
    relationshipStatus?: string[];
  };
  customAudiences?: string[];
  lookalikAudiences?: string[];
  excludeAudiences?: string[];
  connections?: {
    fanOf?: string[];
    friendsOfFans?: string[];
    exclude?: string[];
  };
  expandedTargeting: boolean;
  audienceOptimization: boolean;

  // Ad Set Level - Placements
  automaticPlacements: boolean;
  manualPlacements?: {
    facebook_positions?: string[];
    instagram_positions?: string[];
    audience_network_positions?: string[];
    messenger_positions?: string[];
    whatsapp_positions?: string[];
  };
  devicePlatforms?: string[];
  mobileDevices?: string[];
  operatingSystems?: {
    ios_min?: string;
    ios_max?: string;
    android_min?: string;
    android_max?: string;
  };
  connectionTypes?: string[];

  // Ad Set Level - Optimization & Delivery
  conversionLocation?: 'website' | 'calls';
  pixelId: string; // Auto-fetched from OAuth, renamed from dataset
  conversionEvent: string;
  dynamicCreative: boolean;
  attributionWindow: string;
  useAcceleratedDelivery?: boolean;

  // Ad Level
  selectedPageId: string; // Auto-fetched from OAuth
  instagramAccountId?: string;
  format: string;
  mediaFiles?: File[];
  carouselCards?: Array<{
    image?: File;
    video?: File;
    headline: string;
    description: string;
    link: string;
  }>;
  // These are already defined in the extended interface
  destinationType: string;
  websiteUrl?: string;
  displayLink?: string;
  urlParameters?: string;
  callToAction: string;
  instantExperience?: boolean;
  leadForm?: boolean;

  // Duplication Settings for 49 Ad Sets
  duplicateAdSets: boolean;
  adSetDuplicationBudgets?: Array<{
    dailyBudget?: number;
    lifetimeBudget?: number;
  }>;
  useSameBudgetForAll: boolean;
  defaultDuplicationBudget: number; // Default $1

  // Process Control
  publishDirectly: boolean;
  postId?: string;
  manualPostId?: string;
  useExistingPost?: boolean;
}

// Export all constants for use in components
// Aliases for component imports
export const BID_STRATEGIES = CAMPAIGN_BID_STRATEGIES;
export const OPTIMIZATION_GOALS = ADSET_OPTIMIZATION_GOALS;
export const CALL_TO_ACTIONS = AD_CTA_TYPES;
export const DESTINATION_TYPES = AD_DESTINATION_TYPES;
export const URL_TYPES = AD_DESTINATION_TYPES;

// Simplified placements options for component
export const PLACEMENTS_OPTIONS = [
  { value: 'facebook_feed', label: 'Facebook Feed' },
  { value: 'instagram_feed', label: 'Instagram Feed' },
  { value: 'facebook_stories', label: 'Facebook Stories' },
  { value: 'instagram_stories', label: 'Instagram Stories' },
  { value: 'facebook_reels', label: 'Facebook Reels' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'audience_network', label: 'Audience Network' },
  { value: 'messenger', label: 'Messenger' }
];

export const MetaAdsConstants = {
  CAMPAIGN_OBJECTIVES,
  BUYING_TYPES,
  CAMPAIGN_BID_STRATEGIES,
  SPECIAL_AD_CATEGORIES,
  ADSET_OPTIMIZATION_GOALS,
  BILLING_EVENTS,
  AUDIENCE_LOCATIONS,
  AUDIENCE_AGE_RANGE,
  AUDIENCE_GENDERS,
  AUDIENCE_LANGUAGES,
  PLACEMENT_PLATFORMS,
  DEVICE_PLATFORMS,
  MOBILE_DEVICES,
  CONNECTION_TYPES,
  PIXEL_STANDARD_EVENTS,
  ATTRIBUTION_WINDOWS,
  AD_FORMATS,
  AD_CREATIVE_MEDIA_SPECS,
  AD_DESTINATION_TYPES,
  AD_CTA_TYPES
};