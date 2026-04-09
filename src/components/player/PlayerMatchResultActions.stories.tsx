import type { Meta, StoryObj } from '@storybook/react';
import PlayerMatchResultActions from './PlayerMatchResultActions';
import type { MatchResultsPending } from '@/types/database';

const basePending: MatchResultsPending = {
  id: 'pending-1',
  match_id: 'match-1',
  winner_team_id: 'team-a',
  is_halved: false,
  proposed_by_player_id: 'player-1',
  confirmed_by_player_id: null,
  rejected_by_player_id: null,
  superseded_by_proposal_id: null,
  status: 'pending',
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  confirmed_at: null,
  promoted_at: null,
};

const meta: Meta<typeof PlayerMatchResultActions> = {
  title: 'Player/PlayerMatchResultActions',
  component: PlayerMatchResultActions,
  parameters: {
    layout: 'padded',
  },
  args: {
    matchId: 'match-1',
    matchDate: '2020-01-01',
    matchTime: '08:00',
    teamA: { id: 'team-a', name: 'Team Thompson' },
    teamB: { id: 'team-b', name: 'Team Burgess' },
    winnerTeamId: null,
    isHalved: false,
    resultSetByOfficial: false,
    pending: null,
    currentPlayerId: 'player-2',
    participantPlayerIds: ['player-1', 'player-2'],
    onSuccessfulMutation: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof PlayerMatchResultActions>;

export const BeforeTeeTime: Story = {
  args: {
    matchDate: '2099-12-31',
    matchTime: '23:59',
  },
};

export const ReportOpen: Story = {
  args: {
    matchDate: '2020-01-01',
    matchTime: '08:00',
  },
};

export const WaitingAsProposer: Story = {
  args: {
    currentPlayerId: 'player-1',
    pending: basePending,
  },
};

export const ConfirmAsOpponent: Story = {
  args: {
    currentPlayerId: 'player-2',
    pending: basePending,
  },
};

export const OfficialLocked: Story = {
  args: {
    resultSetByOfficial: true,
    pending: null,
  },
};

export const RecordedOnScoreboard: Story = {
  args: {
    winnerTeamId: 'team-a',
    isHalved: false,
    pending: null,
  },
};

export const HalvedPending: Story = {
  args: {
    currentPlayerId: 'player-2',
    pending: {
      ...basePending,
      winner_team_id: null,
      is_halved: true,
    },
  },
};
