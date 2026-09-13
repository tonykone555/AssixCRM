const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const original = `            {viewMode === 'table' ? (
              <TableView
                leads={filteredLeads}
                onUpdateLead={handleUpdateLead}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onUpdateStatus={handleUpdateStatus}
                onOpenInteractionModal={(lead) => setSelectedLeadForInteraction(lead)}
                onShareLead={(lead) => setShareTargetLead(lead)}
                onDeleteLead={handleDeleteLead}
                onOpenScreenshotLightbox={(lead, idx) =>
                  setLightboxTarget({ lead, imageIndex: idx })
                }
                isDarkMode={isDarkMode}
                isSuperAdmin={isSuperAdmin}
              />
            ) : (
              <PipelineView
                leads={filteredLeads}
                onUpdateLead={handleUpdateLead}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onUpdateStatus={handleUpdateStatus}
                onOpenInteractionModal={(lead) => setSelectedLeadForInteraction(lead)}
                onShareLead={(lead) => setShareTargetLead(lead)}
                onOpenScreenshotLightbox={(lead, idx) =>
                  setLightboxTarget({ lead, imageIndex: idx })
                }
                isDarkMode={isDarkMode}
              />
            )}`;

const fixed = `            {viewMode === 'radar' && (
              <LeadRadar onAddLead={handleAddLead} existingLeads={leads} />
            )}
            {viewMode === 'table' && (
              <TableView
                leads={filteredLeads}
                onUpdateLead={handleUpdateLead}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onUpdateStatus={handleUpdateStatus}
                onOpenInteractionModal={(lead) => setSelectedLeadForInteraction(lead)}
                onShareLead={(lead) => setShareTargetLead(lead)}
                onDeleteLead={handleDeleteLead}
                onOpenScreenshotLightbox={(lead, idx) =>
                  setLightboxTarget({ lead, imageIndex: idx })
                }
                isDarkMode={isDarkMode}
                isSuperAdmin={isSuperAdmin}
              />
            )}
            {viewMode === 'kanban' && (
              <PipelineView
                leads={filteredLeads}
                onUpdateLead={handleUpdateLead}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onUpdateStatus={handleUpdateStatus}
                onOpenInteractionModal={(lead) => setSelectedLeadForInteraction(lead)}
                onShareLead={(lead) => setShareTargetLead(lead)}
                onOpenScreenshotLightbox={(lead, idx) =>
                  setLightboxTarget({ lead, imageIndex: idx })
                }
                isDarkMode={isDarkMode}
              />
            )}`;

code = code.replace(original, fixed);
fs.writeFileSync('src/App.tsx', code);
