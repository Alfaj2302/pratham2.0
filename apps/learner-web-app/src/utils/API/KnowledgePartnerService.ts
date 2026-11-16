import { KnowledgePartner } from '@learner/components/themantic/knowledgePartners/partnersData';
import knowledgePartnersData from '@learner/components/themantic/knowledgePartners/knowledgePartners.json';

// Static mock data; images are served from /public/knowledge
const knowledgePartners = knowledgePartnersData as KnowledgePartner[];

export const getKnowledgePartners = async (): Promise<KnowledgePartner[]> =>
  knowledgePartners;
