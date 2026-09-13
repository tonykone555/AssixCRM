const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const regex = /\/\/ Marketplace Rules[\s\S]*match \/marketplaceAuditEvents\/\{docId\} \{\s*allow read, update, delete:[^}]*\}\s*allow create:[^}]*\}\s*\}/m;

const newRules = `
    // Marketplace Rules - Strictly isolated by ownerUid
    match /oauthStates/{docId} {
      allow read, write: if false; // Server-only
    }
    match /marketplaceConnections/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /arbitrageOpportunities/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /inventoryItems/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /marketplaceListings/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /orders/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /automationRules/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow delete: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow update: if isAuthenticated() && (resource.data.ownerUid == request.auth.uid || isSuperAdmin()) && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow create: if isAuthenticated() && (request.resource.data.ownerUid == request.auth.uid || isSuperAdmin());
    }
    match /marketplaceAuditEvents/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.ownerUid == request.auth.uid || isSuperAdmin());
      allow write: if false; // Server-only creation/update
    }
`;

code = code.replace(regex, newRules);
fs.writeFileSync('firestore.rules', code);
