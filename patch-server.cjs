const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `      // 2. Search Google Maps Places API`;

const startIdx = code.indexOf(targetStr);
const endIdx = code.indexOf('return res.json({\n        success: true,', startIdx);

if (startIdx > -1 && endIdx > -1) {
    const replacement = `      // 2. Fallback to free Overpass API (OpenStreetMap) search
      const searchQuery = \`\${extractedData.storeName} \${extractedData.city}\`.trim();
      let place = null;

      try {
        // Build a broad Overpass QL query to search for the node by name
        // We use a regex match (~"Name", "i") for case-insensitive matching
        const overpassQuery = \`
          [out:json][timeout:10];
          (
            node["name"~"(?i)\${extractedData.storeName}"];
            way["name"~"(?i)\${extractedData.storeName}"];
          );
          out center;
        \`;

        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const osmRes = await fetch(overpassUrl, {
          method: 'POST',
          body: overpassQuery
        });

        if (osmRes.ok) {
          const osmData = await osmRes.json();
          if (osmData && osmData.elements && osmData.elements.length > 0) {
            // Find the best match, ideally one that has tags
            const bestMatch = osmData.elements.find((e: any) => e.tags && e.tags.name) || osmData.elements[0];
            
            if (bestMatch && bestMatch.tags) {
              const addressParts = [];
              if (bestMatch.tags['addr:housenumber']) addressParts.push(bestMatch.tags['addr:housenumber']);
              if (bestMatch.tags['addr:street']) addressParts.push(bestMatch.tags['addr:street']);
              if (bestMatch.tags['addr:city']) addressParts.push(bestMatch.tags['addr:city']);
              
              const formattedAddress = addressParts.length > 0 
                ? addressParts.join(' ') 
                : \`\${extractedData.street} \${extractedData.city}\`.trim();

              place = {
                displayName: { text: bestMatch.tags.name || extractedData.storeName },
                formattedAddress: formattedAddress,
                // We construct a direct OSM link
                websiteUri: bestMatch.tags.website || '',
                googleMapsUri: \`https://www.openstreetmap.org/\${bestMatch.type}/\${bestMatch.id}\`
              };
            }
          }
        }
      } catch (osmErr) {
        console.error('OSM Search failed, skipping fallback:', osmErr);
      }

      // If OSM fails to find it, just generate a generic Google Maps search URL so the user can still click it
      if (!place) {
        const query = encodeURIComponent(\`\${extractedData.storeName} \${extractedData.street} \${extractedData.city}\`.trim());
        place = {
          displayName: { text: extractedData.storeName },
          formattedAddress: \`\${extractedData.street} \${extractedData.city}\`.trim(),
          googleMapsUri: \`https://www.google.com/maps/search/?api=1&query=\${query}\`
        };
      }

      `;

    code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
    fs.writeFileSync('server.ts', code);
}
