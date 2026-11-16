export type PartnerKind = 'individual' | 'organisation';

export interface KnowledgePartner {
  /** URL slug used by /themantic/knowledge-partners/[partnerId] */
  id: string;
  name: string;
  kind: PartnerKind;
  /** "Type of Partner" from the partners sheet; shown under the name */
  partnerType: string;
  /** Location / qualification line on the details page */
  descriptor?: string;
  expertise: string[];
  /** Path under /public; the grey box stays empty when absent */
  image?: string;
  about: string[];
  contributions?: string[];
  summary?: string;
  website?: string;
  status: 'Done' | 'Pending';
}

export const KNOWLEDGE_PARTNERS_BASE_URL = '/themantic/knowledge-partners';
