import { calculateCourseHandicap } from '../courseHandicap';

describe('calculateCourseHandicap', () => {
  it('calculates course handicap with positive course adjustment', () => {
    const value = calculateCourseHandicap({
      handicapIndex: 10.2,
      slope: 125,
      rating: 72.6,
      par: 72,
    });

    expect(value).toBe(12);
  });

  it('calculates course handicap with negative course adjustment', () => {
    const value = calculateCourseHandicap({
      handicapIndex: 15.4,
      slope: 113,
      rating: 70.2,
      par: 72,
    });

    expect(value).toBe(14);
  });

  it('rounds to nearest whole number around half boundaries', () => {
    const roundsDown = calculateCourseHandicap({
      handicapIndex: 10,
      slope: 113,
      rating: 72.49,
      par: 72,
    });
    const roundsUp = calculateCourseHandicap({
      handicapIndex: 10,
      slope: 113,
      rating: 72.5,
      par: 72,
    });

    expect(roundsDown).toBe(10);
    expect(roundsUp).toBe(11);
  });

  it('returns null when any required input is missing', () => {
    expect(
      calculateCourseHandicap({
        handicapIndex: null,
        slope: 113,
        rating: 72,
        par: 72,
      }),
    ).toBeNull();
    expect(
      calculateCourseHandicap({
        handicapIndex: 10,
        slope: null,
        rating: 72,
        par: 72,
      }),
    ).toBeNull();
    expect(
      calculateCourseHandicap({
        handicapIndex: 10,
        slope: 113,
        rating: null,
        par: 72,
      }),
    ).toBeNull();
    expect(
      calculateCourseHandicap({
        handicapIndex: 10,
        slope: 113,
        rating: 72,
        par: null,
      }),
    ).toBeNull();
  });
});
