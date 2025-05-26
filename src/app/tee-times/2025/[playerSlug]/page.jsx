import PlayerPageClient from './PlayerPageClient';

export default function Page({ params }) {
  return <PlayerPageClient playerSlug={params.playerSlug} />;
} 