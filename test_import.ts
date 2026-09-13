import * as admin from 'firebase-admin';
console.log(admin.cert ? 'cert exists' : 'cert is missing');
