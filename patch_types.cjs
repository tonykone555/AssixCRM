const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code += `
export interface MarketplaceConnection {
  ownerUid: string;
  provider: 'ebay' | 'etsy' | 'vinted';
  environment: 'sandbox' | 'production';
  externalAccountId: string;
  displayName: string;
  encryptedRefreshToken: string;
  grantedScopes: string[];
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'expired';
  connectedAt: string;
  refreshedAt: string;
  disconnectedAt?: string;
  id?: string;
}

export interface ArbitrageOpportunity {
  ownerUid: string;
  sourceMarketplace: string;
  sourceListingId?: string;
  sourceUrl: string;
  sourceTitle: string;
  sourcePrice: number;
  sourceCurrency: string;
  sourceShipping: number;
  sourceImages: string[];
  sourceCondition: string;
  category: string;
  attributes: Record<string, string>;
  estimatedResalePrice: number;
  estimatedMarketplaceFees: number;
  estimatedOutboundShipping: number;
  estimatedTaxReserve: number;
  estimatedRepairCost: number;
  estimatedOtherCosts: number;
  expectedNetProfit: number;
  expectedMarginPercent: number;
  expectedRoiPercent: number;
  confidenceScore: number;
  comparableListings: any[];
  notes: string;
  status: 'discovered' | 'reviewing' | 'approved_for_purchase' | 'acquired' | 'listing_draft' | 'ready_for_approval' | 'listed' | 'sold' | 'fulfilled' | 'rejected' | 'expired' | 'unavailable' | 'archived';
  createdAt: string;
  updatedAt: string;
  id?: string;
}

export interface InventoryItem {
  ownerUid: string;
  internalSku: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  quantity: number;
  acquisitionCost: number;
  acquisitionCurrency: string;
  acquiredAt: string;
  ownershipConfirmed: boolean;
  ownershipConfirmedAt?: string;
  userOwnedImages: string[];
  attributes: Record<string, string>;
  storageLocation?: string;
  status: 'in_stock' | 'listed' | 'sold' | 'lost' | 'damaged' | 'returned';
  createdAt: string;
  updatedAt: string;
  id?: string;
}

export interface MarketplaceListing {
  ownerUid: string;
  inventoryItemId: string;
  marketplace: string;
  externalListingId?: string;
  externalOfferId?: string;
  internalSku: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  listingStatus: 'draft' | 'pending_publish' | 'active' | 'ended' | 'error';
  listingUrl?: string;
  publishedAt?: string;
  lastSyncedAt: string;
  endedAt?: string;
  id?: string;
}

export interface Order {
  ownerUid: string;
  marketplace: string;
  externalOrderId: string;
  listingId: string;
  inventoryItemId: string;
  quantity: number;
  salePrice: number;
  marketplaceFees: number;
  shippingCost: number;
  estimatedNetProfit: number;
  fulfillmentStatus: 'pending' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  trackingNumber?: string;
  carrier?: string;
  orderedAt: string;
  shippedAt?: string;
  lastSyncedAt: string;
  id?: string;
}

export interface AutomationRule {
  ownerUid: string;
  name: string;
  enabled: boolean;
  trigger: string;
  conditions: Record<string, any>;
  action: string;
  requiresApproval: boolean;
  maximumAcquisitionPrice?: number;
  minimumExpectedProfit?: number;
  minimumMarginPercent?: number;
  minimumConfidenceScore?: number;
  createdAt: string;
  updatedAt: string;
  id?: string;
}

export interface MarketplaceAuditEvent {
  ownerUid: string;
  actorType: 'user' | 'system' | 'mcp' | 'admin';
  actorUid: string;
  source: string;
  action: string;
  targetType: string;
  targetId: string;
  requestSummary: string;
  resultSummary: string;
  idempotencyKey?: string;
  status: 'success' | 'failure' | 'pending';
  createdAt: string;
  id?: string;
}
`;

fs.writeFileSync('src/types.ts', code);
console.log("Types updated.");
