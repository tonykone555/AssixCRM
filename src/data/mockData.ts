import { Lead, CustomFieldDefinition } from '../types';

export const INITIAL_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  { id: 'field_followers', name: 'Follower Count', type: 'text' },
  { id: 'field_niche', name: 'Niche', type: 'select', options: ['E-commerce', 'Fitness & Health', 'Luxury & Fashion', 'SaaS / Tech', 'Agency & Coaching', 'Creator / Influencer'] },
  { id: 'field_offer', name: 'Pitched Offer', type: 'text' },
  { id: 'field_location', name: 'Location / Region', type: 'text' },
];

// Empty mock leads default
export const INITIAL_LEADS: Lead[] = [];

export const SAMPLE_STARTER_LEADS: Lead[] = [
  {
    id: 'sample_lead_1',
    name: 'Aura Fitness Apparel',
    instagramHandle: 'aurafitness.official',
    phone: '+1 (305) 842-1920',
    isAppleVerified: true,
    status: 'Interested',
    tags: ['Fitness', 'E-commerce'],
    uploadBatchId: 'batch_spring_outreach',
    uploadBatchName: 'Spring Outreach',
    uploadBatchDate: new Date().toISOString(),
    notes: 'Interested in influencer outreach and content scaling. Sent proposal.',
    website: 'https://aurafitness.com',
    ownerEmail: 'tonykone21@gmail.com',
    assignedAccountEmails: ['tonykone21@gmail.com'],
    screenshots: [],
    interactions: [],
    customFields: {
      field_followers: '45.2K',
      field_niche: 'Fitness & Health',
      field_offer: 'Scale Package',
      field_location: 'Miami, FL'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample_lead_2',
    name: 'Luxe Botanicals',
    instagramHandle: 'luxebotanicals_co',
    phone: '+1 (310) 912-4482',
    isAppleVerified: true,
    status: 'Contacted',
    tags: ['Skincare', 'Luxury'],
    uploadBatchId: 'batch_spring_outreach',
    uploadBatchName: 'Spring Outreach',
    uploadBatchDate: new Date().toISOString(),
    notes: 'DM sent regarding content optimization. Waiting for response.',
    website: 'https://luxebotanicals.co',
    ownerEmail: 'tonykone21@gmail.com',
    assignedAccountEmails: ['tonykone21@gmail.com'],
    screenshots: [],
    interactions: [],
    customFields: {
      field_followers: '82.1K',
      field_niche: 'Luxury & Fashion',
      field_offer: 'Growth Retainer',
      field_location: 'Los Angeles, CA'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample_lead_3',
    name: 'Apex Digital Agency',
    instagramHandle: 'apexdigital.agency',
    phone: '+1 (512) 693-2109',
    isAppleVerified: false,
    status: 'Closed Won',
    tags: ['Agency', 'High Ticket'],
    uploadBatchId: 'batch_b2b_agency',
    uploadBatchName: 'B2B Inbound',
    uploadBatchDate: new Date().toISOString(),
    notes: 'Contract signed! Monthly retainer active.',
    website: 'https://apexdigital.io',
    ownerEmail: 'tonykone21@gmail.com',
    assignedAccountEmails: ['tonykone21@gmail.com'],
    screenshots: [],
    interactions: [],
    customFields: {
      field_followers: '18.9K',
      field_niche: 'Agency & Coaching',
      field_offer: 'Full Suite',
      field_location: 'Austin, TX'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
