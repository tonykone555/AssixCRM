import { Lead } from '../types';

/**
 * Extracts a phone number from a lead's explicit phone field,
 * custom fields (Phone, Mobile, Tel, Cell), or bio notes.
 */
export function extractLeadPhone(lead: Lead): string {
  if (lead.phone && lead.phone.trim()) {
    return lead.phone.trim();
  }

  if (lead.customFields) {
    const phoneKeys = ['phone', 'mobile', 'cell', 'telephone', 'tel', 'contact number', 'phone number'];
    for (const key of Object.keys(lead.customFields)) {
      if (phoneKeys.includes(key.toLowerCase()) && lead.customFields[key]?.trim()) {
        return lead.customFields[key].trim();
      }
    }
  }

  // Check if notes contains a phone number pattern (e.g. +1 (555) 000-0000 or 555-000-0000)
  if (lead.notes) {
    const match = lead.notes.match(/(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (match) {
      return match[0];
    }
  }

  return '';
}

/**
 * Cleans and normalizes a phone number for international/US dialing (e.g. +1XXXXXXXXXX)
 */
export function formatPhoneForDialing(phone: string): string {
  if (!phone) return '';
  // Remove spaces, parentheses, dashes, dots
  let digits = phone.replace(/[^\d+]/g, '');

  // If starts with +, keep +
  if (digits.startsWith('+')) {
    return digits;
  }

  // If 10 digits (standard US/Canada), add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If 11 digits and starts with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

/**
 * Prettifies a phone number for UI display: +1 (XXX) XXX-XXXX
 */
export function formatPhoneDisplay(phone: string): string {
  const dialed = formatPhoneForDialing(phone);
  if (!dialed) return '';

  // US/Canada standard format
  const usMatch = dialed.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (usMatch) {
    return `+1 (${usMatch[1]}) ${usMatch[2]}-${usMatch[3]}`;
  }

  return dialed;
}

/**
 * Generates FaceTime Audio link compatible with iOS, iPadOS, and macOS: facetime-audio://+1XXXXXXXXXX
 */
export function getFaceTimeAudioUrl(phone: string): string {
  const clean = formatPhoneForDialing(phone);
  if (!clean) return '';
  // Clean phone number (e.g., +18005550199 or 18005550199)
  // Standard iOS FaceTime Audio format is facetime-audio://+1XXXXXXXXXX
  return `facetime-audio://${clean}`;
}

/**
 * Triggers a FaceTime Audio call on iPhone/iOS by breaking out of iframe bounds
 */
export function triggerFaceTimeAudioCall(phone: string) {
  const clean = formatPhoneForDialing(phone);
  if (!clean) return;

  const url = `facetime-audio://${clean}`;
  const promptUrl = `facetime-audio:prompt:${clean}`;
  const directUrl = `facetime-audio:${clean}`;

  try {
    if (window.top) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (err) {
    // Fallback if top window navigation is blocked
    try {
      window.location.href = promptUrl;
    } catch {
      window.location.href = directUrl;
    }
  }
}

/**
 * Generates FaceTime Video link: facetime:+1XXXXXXXXXX
 */
export function getFaceTimeVideoUrl(phone: string): string {
  const clean = formatPhoneForDialing(phone);
  return clean ? `facetime:${clean}` : '';
}

/**
 * Generates iMessage / SMS link: sms:+1XXXXXXXXXX
 */
export function getIMessageUrl(phone: string, body?: string): string {
  const clean = formatPhoneForDialing(phone);
  if (!clean) return '';
  if (body) {
    return `sms:${clean}&body=${encodeURIComponent(body)}`;
  }
  return `sms:${clean}`;
}

/**
 * Generates standard telephone dialer link: tel:+1XXXXXXXXXX
 */
export function getTelUrl(phone: string): string {
  const clean = formatPhoneForDialing(phone);
  return clean ? `tel:${clean}` : '';
}

/**
 * Generates WhatsApp chat & call link: https://wa.me/XXXXXXXXXX
 */
export function getWhatsAppUrl(phone: string, text?: string): string {
  const clean = formatPhoneForDialing(phone).replace(/^\+/, '');
  if (!clean) return '';
  if (text) {
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${clean}`;
}
