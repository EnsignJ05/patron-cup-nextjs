import { listScoringFormats, resolveScoringFormat } from '@/lib/scoring/formats';

describe('scoring format registry', () => {
  it('resolves Two Man Better Ball to the four-ball net best ball format', () => {
    const { format, isUnknown } = resolveScoringFormat('Two Man Better Ball');
    expect(isUnknown).toBe(false);
    expect(format.key).toBe('four_ball_net_best_ball');
    expect(format.playersPerTeam).toBe(2);
  });

  it('resolves Head to Head to the singles match play format', () => {
    const { format, isUnknown } = resolveScoringFormat('Head to Head');
    expect(isUnknown).toBe(false);
    expect(format.key).toBe('singles_match_play');
    expect(format.playersPerTeam).toBe(1);
  });

  it('falls back to a safe unknown format for an unrecognized match type', () => {
    const { format, isUnknown } = resolveScoringFormat('Scramble');
    expect(isUnknown).toBe(true);
    expect(format.scoreSideHole([{ playerId: 'p1', net: 3, isConceded: false }])).toBeNull();
  });

  it('lists every registered format', () => {
    const labels = listScoringFormats().map((f) => f.label);
    expect(labels).toEqual(['Two Man Better Ball', 'Head to Head']);
  });

  describe('fourBallNetBestBall.scoreSideHole', () => {
    it('takes the lower of the two net scores', () => {
      const { format } = resolveScoringFormat('Two Man Better Ball');
      const result = format.scoreSideHole([
        { playerId: 'a', net: 4, isConceded: false },
        { playerId: 'b', net: 3, isConceded: false },
      ]);
      expect(result).toBe(3);
    });

    it('ignores a conceded ball', () => {
      const { format } = resolveScoringFormat('Two Man Better Ball');
      const result = format.scoreSideHole([
        { playerId: 'a', net: 4, isConceded: false },
        { playerId: 'b', net: null, isConceded: true },
      ]);
      expect(result).toBe(4);
    });

    it('returns null when nobody has entered a score', () => {
      const { format } = resolveScoringFormat('Two Man Better Ball');
      const result = format.scoreSideHole([
        { playerId: 'a', net: null, isConceded: false },
        { playerId: 'b', net: null, isConceded: false },
      ]);
      expect(result).toBeNull();
    });
  });

  describe('singlesMatchPlay.scoreSideHole', () => {
    it('returns the single player net score', () => {
      const { format } = resolveScoringFormat('Head to Head');
      expect(format.scoreSideHole([{ playerId: 'a', net: 5, isConceded: false }])).toBe(5);
    });

    it('returns null when the player picked up', () => {
      const { format } = resolveScoringFormat('Head to Head');
      expect(format.scoreSideHole([{ playerId: 'a', net: null, isConceded: true }])).toBeNull();
    });
  });
});
