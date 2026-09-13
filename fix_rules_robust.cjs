const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const prefix = code.substring(0, code.indexOf('// Marketplace Rules'));

const newRules = `// Marketplace Rules - Strictly isolated by ownerUid
    match /oauthStates/{docId} {
      allow read, write: if false;
    }
    match /marketplaceConnections/{docId} {
      allow read, delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /arbitrageOpportunities/{docId} {
      allow read, delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /inventoryItems/{docId} {
      allow read, delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /marketplaceListings/{docId} {
      allow read, delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /orders/{docId} {
      allow read, delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /automationRules/{docId} {
      allow read, delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /marketplaceAuditEvents/{docId} {
      allow read: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow write: if false; // Server-only append
    }
  }
}
`;

fs.writeFileSync('firestore.rules', prefix + newRules);
