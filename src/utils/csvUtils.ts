import { Lead, LeadStatus } from '../types';

export function exportLeadsToCSV(leads: Lead[], filename = 'crm_leads_export.csv') {
  if (!leads.length) return;

  const customFieldKeysSet = new Set<string>();
  leads.forEach((lead) => {
    if (lead.customFields) {
      Object.keys(lead.customFields).forEach((key) => customFieldKeysSet.add(key));
    }
  });
  const customFieldKeys = Array.from(customFieldKeysSet);

  const headers = [
    'Name',
    'Email',
    'Phone',
    'Lead Type',
    'Instagram Handle',
    'Instagram Link',
    'Website',
    'Status',
    'Tags',
    'Last Interaction Date',
    'Demo Video URL',
    'Notes',
    ...customFieldKeys,
  ];

  const escapeCSV = (str: string | number | undefined | null) => {
    if (str === undefined || str === null) return '""';
    const stringified = String(str).replace(/"/g, '""');
    return `"${stringified}"`;
  };

  const rows = leads.map((lead) => {
    const handleClean = (lead.instagramHandle || '').replace(/^@/, '');
    const igLink = handleClean ? `https://instagram.com/${handleClean}` : '';
    const leadType = lead.isNormalLead ? 'Normal Lead' : 'Instagram Lead';
    const customFieldValues = customFieldKeys.map((key) =>
      escapeCSV(lead.customFields?.[key] || '')
    );

    return [
      escapeCSV(lead.name),
      escapeCSV(lead.email || ''),
      escapeCSV(lead.phone || ''),
      escapeCSV(leadType),
      escapeCSV(handleClean ? `@${handleClean}` : ''),
      escapeCSV(igLink),
      escapeCSV(lead.website || ''),
      escapeCSV(lead.status),
      escapeCSV(lead.tags.join(', ')),
      escapeCSV(lead.lastInteractionDate || ''),
      escapeCSV(lead.demoVideoUrl || ''),
      escapeCSV(lead.notes || ''),
      ...customFieldValues,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadSampleCSVTemplate(type: 'normal' | 'instagram' | 'real_estate' = 'real_estate') {
  let sampleCSV = '';
  let filename = 'real_estate_leads_template.csv';

  if (type === 'real_estate') {
    sampleCSV = `Name,Email,Phone,Instagram Handle,Website,Brokerage,Location,Status,Tags,Active_Listings,Avg_Price_Point,Notes,Facebook,LinkedIn,Other Socials,Zillow Profile,Priority,Priority Score,Cold Call Outreach,Instagram DM Outreach,Email Outreach
Sarah Jenkins,sarah@jenkinsrealty.com,+1 (555) 234-5678,@sarah_jenkins_realtor,https://jenkinsrealty.com,Compass Real Estate,Miami FL,New,"Luxury, Waterfront",12,$2.4M,"Top producer in South Beach.",https://facebook.com/sarahjenkinsrealty,https://linkedin.com/in/sarahjenkinsrealty,,https://zillow.com/profile/sarahjenkins,High,95,"Hi Sarah, saw your 12 luxury listings in South Beach. Quick question on your video walkthroughs?","Hey @sarah_jenkins_realtor, loved your recent Brickell penthouse reel!","Hi Sarah, impressed by your $2.4M avg price point in Miami."
Marcus Vance,marcus@vanceproperties.io,+1 (555) 876-5432,@marcus_vance_re,https://vanceproperties.io,eXp Realty,Austin TX,Follow Up,"Commercial, Multi-Family",8,$1.1M,"Looking for AI video tools.",https://facebook.com/marcusvance,https://linkedin.com/in/marcusvance,,https://zillow.com/profile/marcusvance,VIP,98,"Marcus, quick call regarding AI video walkthroughs for your Austin multi-family listings?","Hey Marcus, sent you a quick iMessage on your Austin portfolio!","Hi Marcus, reaching out about automated video tours for eXp agents."
Elena Rostova,elena@luxuryliving.com,+1 (555) 432-1098,@elena_luxuryliving,https://luxuryliving.com,Coldwell Banker,Los Angeles CA,Interested,"Luxury, High Ticket",19,$4.8M,"Wants AI preview tours.",https://facebook.com/elenarostova,https://linkedin.com/in/elenarostova,,https://zillow.com/profile/elenarostova,Medium,78,"Elena, saw your $4.8M listing in Beverly Hills. Do you use AI voice previews?","Hey Elena, love the LA luxury estate coverage!","Elena, following up on AI video pitch demos for Coldwell Banker listings."`;
    filename = 'real_estate_leads_template.csv';
  } else if (type === 'normal') {
    sampleCSV = `Name,Email,Phone,Website,Status,Tags,Company / Industry,Notes
Acme Logistics,contact@acmelogistics.com,+1 (555) 234-5678,https://acmelogistics.com,Interested,"Logistics, B2B",Supply Chain,"Requested enterprise pricing deck."
Apex Tech Solutions,sales@apextech.io,+1 (555) 876-5432,https://apextech.io,New,"SaaS, Cloud",Software,"Inbound website demo request."
Horizon Real Estate,info@horizonrealty.net,+1 (555) 432-1098,https://horizonrealty.net,Follow Up,"Real Estate, High Ticket",Property Investment,"Follow up scheduled for Thursday."`;
    filename = 'normal_leads_template.csv';
  } else {
    sampleCSV = `Name,Email,Phone,Instagram Handle,Website,Status,Tags,Follower Count,Niche,Notes
Aesthetic Co,contact@aesthetic.co,+1 (555) 321-7654,@aesthetic_co,https://aesthetic.co,Interested,"Luxury, Fashion",120K,Luxury & Fashion,"Inquired about custom IG marketing package."
Vibe Fit Store,support@vibefit.com,+1 (555) 987-1234,@vibefit_store,https://vibefit.com,New,"Fitness, Ecom",85K,Fitness & Health,"High interaction on recent story."
Digital Wave Studio,hello@digitalwave.io,,@digitalwave_io,https://digitalwave.io,Follow Up,"SaaS",45K,SaaS / Tech,"Needs custom workflow integration."`;
    filename = 'instagram_leads_template.csv';
  }

  const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSVRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface CSVParseOptions {
  isNormalLead?: boolean;
}

export function parseCSVToLeads(csvText: string, options?: CSVParseOptions): Lead[] {
  const rawRows = parseCSVRows(csvText);
  if (rawRows.length < 2) return [];

  const rawHeaders = rawRows[0];
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const leads: Lead[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const values = rawRows[i];
    if (!values || values.length === 0 || values.every((v) => !v || !v.trim())) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] ? values[idx].trim() : '';
    });

    const name =
      rowObj['agentname'] ||
      rowObj['name'] ||
      rowObj['leadname'] ||
      rowObj['company'] ||
      rowObj['businessname'] ||
      rowObj['organization'] ||
      rowObj['contactname'] ||
      rowObj['title'] ||
      `Lead #${i}`;

    const email = (
      rowObj['email'] ||
      rowObj['mail'] ||
      rowObj['emailaddress'] ||
      rowObj['contactemail'] ||
      rowObj['workemail'] ||
      rowObj['customeremail'] ||
      rowObj['clientemail'] ||
      ''
    ).trim();

    const phone = (
      rowObj['personalcell'] ||
      rowObj['phone'] ||
      rowObj['phonenumber'] ||
      rowObj['businessphone'] ||
      rowObj['telephone'] ||
      rowObj['tel'] ||
      rowObj['mobile'] ||
      rowObj['mobilenumber'] ||
      rowObj['cell'] ||
      rowObj['cellphone'] ||
      rowObj['contactnumber'] ||
      rowObj['whatsapp'] ||
      rowObj['number'] ||
      ''
    ).trim();

    let rawHandle =
      rowObj['instagram'] ||
      rowObj['instagramhandle'] ||
      rowObj['handle'] ||
      rowObj['ig'] ||
      rowObj['instagramlink'] ||
      rowObj['instagramurl'] ||
      rowObj['iglink'] ||
      rowObj['ighandle'] ||
      rowObj['username'] ||
      rowObj['profile'] ||
      rowObj['social'] ||
      '';

    // Clean handle: strip instagram URL prefixes, query strings, slashes, and @
    let handle = rawHandle
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\?.*$/, '')
      .replace(/\/.*$/, '')
      .replace(/^@/, '')
      .trim();

    const isNormal = Boolean(
      options?.isNormalLead ||
      rowObj['leadtype']?.toLowerCase().includes('normal') ||
      (!handle && (email || phone))
    );

    // If still no handle and NOT a normal lead, use name as fallback
    if (!isNormal && !handle && name) {
      handle = name.toLowerCase().replace(/[^a-z0-9._]/g, '');
    }

    // Skip row only if all core identifiers are missing
    if (!handle && !name && !email && !phone) continue;

    const website = rowObj['website'] || rowObj['site'] || rowObj['url'] || '';
    const rawStatus = rowObj['status'] || 'New';
    
    const validStatuses: LeadStatus[] = [
      'New',
      'Contacted',
      'Follow Up',
      'Responded',
      'Interested',
      'Proposal Sent',
      'Closed Won',
      'Closed Lost',
    ];
    
    const matchedStatus = validStatuses.find(
      (s) => s.toLowerCase() === rawStatus.toLowerCase().replace(/[^a-z]/g, ' ')
    ) || 'New';

    const rawTags =
      rowObj['tags'] ||
      rowObj['tag'] ||
      rowObj['prioritytier'] ||
      rowObj['niche'] ||
      rowObj['category'] ||
      rowObj['labels'] ||
      rowObj['label'] ||
      rowObj['keywords'] ||
      rowObj['keyword'] ||
      rowObj['industry'] ||
      rowObj['type'] ||
      '';

    let tags = rawTags
      ? rawTags
          .split(/[,;|/]/)
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean)
      : [];

    if (rowObj['brokerage']) {
      const br = rowObj['brokerage'].trim();
      if (br && !tags.some((t) => t.toLowerCase() === br.toLowerCase())) {
        tags.push(br);
      }
    }

    if (rowObj['businesscity'] || rowObj['location']) {
      const loc = (rowObj['businesscity'] || rowObj['location']).trim();
      if (loc && !tags.some((t) => t.toLowerCase() === loc.toLowerCase())) {
        tags.push(loc);
      }
    }

    if (tags.length === 0) {
      tags = [isNormal ? 'Normal Lead' : 'Imported'];
    }

    const notes = rowObj['notes'] || rowObj['note'] || rowObj['description'] || '';
    const demoVideoUrl = rowObj['demovideourl'] || rowObj['demovideo'] || rowObj['video'] || '';

    // Collect listing photos
    const screenshots: string[] = [];
    headers.forEach((h, idx) => {
      if ((h.includes('listingphoto') || h.includes('photo') || h.includes('image')) && values[idx] && values[idx].trim().startsWith('http')) {
        screenshots.push(values[idx].trim());
      }
    });

    const customFields: Record<string, string> = {};

    // Explicit mapping for special keys
    if (rowObj['outreachcall']) customFields['Cold Call Outreach'] = rowObj['outreachcall'];
    if (rowObj['outreachinstagramdm']) customFields['Instagram DM Outreach'] = rowObj['outreachinstagramdm'];
    if (rowObj['outreachemail']) customFields['Email Outreach'] = rowObj['outreachemail'];
    if (rowObj['facebook']) customFields['Facebook'] = rowObj['facebook'];
    if (rowObj['linkedin']) customFields['LinkedIn'] = rowObj['linkedin'];
    if (rowObj['zillowprofile']) customFields['Zillow Profile'] = rowObj['zillowprofile'];
    if (rowObj['prioritytier']) customFields['Priority'] = rowObj['prioritytier'];
    if (rowObj['priorityscore']) customFields['Priority Score'] = rowObj['priorityscore'];
    if (rowObj['leadangle']) customFields['Lead Angle'] = rowObj['leadangle'];
    if (rowObj['crmrank']) customFields['CRM Rank'] = rowObj['crmrank'];

    // Standard column matching logic to exclude from custom fields
    const standardKeys = [
      'name', 'leadname', 'company', 'businessname', 'organization', 'contactname', 'title', 'agentname',
      'email', 'mail', 'emailaddress', 'contactemail', 'workemail', 'customeremail', 'clientemail',
      'phone', 'phonenumber', 'telephone', 'tel', 'mobile', 'mobilenumber', 'cell', 'cellphone', 'contactnumber', 'whatsapp', 'number', 'personalcell', 'businessphone',
      'leadtype', 'type',
      'instagramhandle', 'instagram', 'handle', 'ig', 'instagramlink', 'instagramurl', 'iglink', 'ighandle',
      'username', 'profile', 'social',
      'website', 'site', 'url',
      'status',
      'tags', 'tag', 'niche', 'category', 'labels', 'label', 'keywords', 'keyword', 'industry', 'brokerage', 'prioritytier', 'priorityscore',
      'followers', 'followercount', 'location', 'region', 'businesscity', 'businessstate', 'businesspostalcode',
      'notes', 'note', 'description', 'lastinteractiondate',
      'demovideourl', 'demovideo', 'video',
      'outreachcall', 'outreachinstagramdm', 'outreachemail', 'facebook', 'linkedin', 'zillowprofile', 'leadangle', 'crmrank'
    ];

    headers.forEach((h, idx) => {
      const isPhotoHeader = h.includes('listingphoto') || h.includes('photo') || h.includes('image');
      if (!standardKeys.includes(h) && !isPhotoHeader && values[idx] && values[idx].trim() !== '') {
        const originalHeader = rawHeaders[idx] ? rawHeaders[idx].trim() : h;
        customFields[originalHeader] = values[idx].trim();
      }
    });

    const newLead: Lead = {
      id: `lead_imp_${Date.now()}_${i}`,
      name,
      email: email || undefined,
      phone: phone || undefined,
      instagramHandle: handle ? handle : (isNormal ? '' : name.toLowerCase().replace(/[^a-z0-9._]/g, '')),
      isNormalLead: isNormal,
      website,
      status: matchedStatus,
      tags,
      productImage: screenshots[0] || '',
      screenshots,
      demoVideoUrl,
      notes,
      customFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastInteractionDate: new Date().toISOString().split('T')[0],
      interactions: [
        {
          id: `int_imp_${Date.now()}_${i}`,
          date: new Date().toISOString().split('T')[0],
          type: 'Note',
          notes: isNormal ? 'Imported as Normal Lead via CSV.' : 'Imported via CSV file.',
        },
      ],
    };

    leads.push(newLead);
  }

  return leads;
}

export function formatLeadForSocialShare(lead: Lead): string {
  const handleClean = (lead.instagramHandle || '').replace(/^@/, '');
  const igUrl = handleClean ? `https://instagram.com/${handleClean}` : '';
  const dmUrl = handleClean ? `https://ig.me/m/${handleClean}` : '';

  return `🎯 Assix CRM Lead
Name: ${lead.name}
Type: ${lead.isNormalLead ? 'Normal Lead' : 'Instagram Lead'}
${lead.email ? `Email: ${lead.email}\n` : ''}${lead.phone ? `Phone: ${lead.phone}\n` : ''}${handleClean ? `Instagram: @${handleClean} (${igUrl})\nDirect DM: ${dmUrl}\n` : ''}Website: ${lead.website || 'N/A'}
Status: ${lead.status}
Tags: ${lead.tags.map((t) => `#${t}`).join(' ')}
Notes: ${lead.notes || 'No notes added.'}`;
}
