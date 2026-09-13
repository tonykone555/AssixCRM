const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const oldLeads = `    match /leads/{leadId} {
      allow read: if isSuperAdmin() || (isAuthenticated() && (
        resource.data.ownerId == request.auth.uid || 
        resource.data.ownerEmail == request.auth.token.email ||
        (resource.data.assignedAccountEmails != null && request.auth.token.email in resource.data.assignedAccountEmails)
      ));
      allow create: if isSuperAdmin() || isAuthenticated();
      allow update, delete: if isSuperAdmin() || (isAuthenticated() && (
        resource.data.ownerId == request.auth.uid || 
        resource.data.ownerEmail == request.auth.token.email ||
        (resource.data.assignedAccountEmails != null && request.auth.token.email in resource.data.assignedAccountEmails)
      ));
    }`;

const newLeads = `    match /leads/{leadId} {
      allow read, create, update, delete: if isAuthenticated();
    }`;

rules = rules.replace(oldLeads, newLeads);

const oldCustomFields = `    match /customFields/{fieldId} {
      allow read: if isSuperAdmin() || (isAuthenticated() && resource.data.ownerId == request.auth.uid);
      allow create: if isSuperAdmin() || (isAuthenticated() && request.resource.data.ownerId == request.auth.uid);
      allow update, delete: if isSuperAdmin() || (isAuthenticated() && resource.data.ownerId == request.auth.uid);
    }`;

const newCustomFields = `    match /customFields/{fieldId} {
      allow read, create, update, delete: if isAuthenticated();
    }`;

rules = rules.replace(oldCustomFields, newCustomFields);

fs.writeFileSync('firestore.rules', rules);
