import React from 'react';
import { notFound } from 'next/navigation';
import PartnerDetails from '@learner/components/themantic/knowledgePartners/PartnerDetails';
import { getKnowledgePartners } from '@learner/utils/API/KnowledgePartnerService';

const getPartner = async (partnerId: string) =>
  (await getKnowledgePartners()).find((partner) => partner.id === partnerId);

export async function generateMetadata({ params }: any) {
  const partner = await getPartner(params?.partnerId);
  return {
    title: partner ? `${partner.name} | Experimento India` : 'Experimento India',
  };
}

const Page = async ({ params }: any) => {
  const partner = await getPartner(params?.partnerId);
  if (!partner) notFound();

  return (
    <div className="thematic-page">
      <PartnerDetails partner={partner} />
    </div>
  );
};

export default Page;
