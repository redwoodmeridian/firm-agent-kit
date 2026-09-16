/**
 * Config.gs — the only file that is about your firm.
 *
 * Claude writes this for you when you run the design session. You can also
 * edit it by hand; it is only a list of ids and a list of steps.
 *
 * The example below is a new-client packet: four documents from four
 * templates, a mechanical review, PDFs, and an email to the client sitting in
 * drafts. Replace it with yours.
 */

var CONFIG = {
  agentName: 'Intake Agent',
  timezone: 'America/Los_Angeles',
  dateFormat: 'MMMM d, yyyy',
  maxPerRun: 5,
  triggerEveryMinutes: 10,

  /* Where the work arrives. One row is one job. */
  intake: {
    sheetId: 'PASTE_THE_SHEET_ID',
    tabName: 'Intake',
    idColumn: 'matter_id',
    statusColumn: 'status',
    readyValue: 'New',           // the only value the agent will pick up
    workingValue: 'Processing',  // claimed, so two runs never collide
    doneValue: 'Generated',
    needsInfoValue: 'Needs info',   // refused: a value was missing
    failedValue: 'Needs attention', // a check failed after writing
    reasonColumn: 'notes'
  },

  /* Where the output goes. One folder per job. */
  output: {
    documentsFolderId: 'PASTE_THE_DOCUMENTS_FOLDER_ID',
    folderNameFormat: '{{MATTER_ID}} - {{CLIENT_NAME}}'
  },

  /* Constants. Available as placeholders in every template. */
  profile: {
    FIRM_NAME: 'Your Firm, PLLC',
    FIRM_ADDRESS: '000 Main Street, Suite 100, Your City, ST 00000',
    FIRM_PHONE: '(000) 000-0000',
    FIRM_EMAIL: 'clientservices@yourfirm.example'
  },

  /* What it does, in this order. */
  steps: [
    {
      type: 'fillTemplates',
      templates: [
        { key: 'engagement', docId: 'PASTE_TEMPLATE_DOC_ID', name: '{{MATTER_ID}} - Engagement Letter' },
        { key: 'fee',        docId: 'PASTE_TEMPLATE_DOC_ID', name: '{{MATTER_ID}} - Fee Agreement' },
        { key: 'conflict',   docId: 'PASTE_TEMPLATE_DOC_ID', name: '{{MATTER_ID}} - Conflict Check Confirmation' },
        { key: 'welcome',    docId: 'PASTE_TEMPLATE_DOC_ID', name: '{{MATTER_ID}} - Welcome and Next Steps' }
      ]
    },
    {
      type: 'review',
      checks: ['no_placeholders_left', 'all_documents_present', 'values_present', 'values_agree'],
      expectedDocuments: 4,
      valuesPresent: ['CLIENT_NAME'],
      valuesAgree: ['FEE_AMOUNT']
    },
    { type: 'exportPdf' },
    {
      type: 'draftEmail',
      to: '{{CLIENT_EMAIL}}',
      subject: 'Your engagement documents, {{CLIENT_NAME}}',
      body: 'Dear {{CLIENT_NAME}},\n\n' +
            'Attached are the documents for your new matter with {{FIRM_NAME}}.\n\n' +
            '{{_DOCUMENT_LIST}}\n\n' +
            'Please review them and let us know if anything looks wrong.\n\n' +
            '{{FIRM_NAME}}\n{{FIRM_PHONE}}',
      attachPdfs: true
    },
    {
      type: 'writeBack',
      columns: {
        packet_folder_url: '{{_FOLDER_URL}}',
        generated_at: '{{_NOW}}'
      }
    }
  ],

  /* The rails. Read these before you change them. */
  rails: {
    neverInvent: true,          // a missing value is a refusal, never a guess
    allowInternalNotify: false, // internal alerts off until you name your domains
    internalDomains: []         // e.g. ['yourfirm.com']
  },

  logging: { tabName: 'Log' }
};

if (typeof module !== 'undefined') module.exports = CONFIG;
