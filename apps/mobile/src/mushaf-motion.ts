export const MUSHAF_SWIPE_START_PX = 10;
export const MUSHAF_SWIPE_AXIS_RATIO = 1.35;
export const MUSHAF_TURN_DISTANCE_RATIO = 0.28;
export const MUSHAF_TURN_VELOCITY = 0.42;

export type MushafTurn = "next" | "previous" | null;

interface TurnDecisionInput {
  dx: number;
  vx: number;
  width: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

/**
 * The Mushaf is an RTL book: dragging to the right reveals the next page,
 * while dragging to the left reveals the previous page.
 */
export function decideMushafTurn({
  dx,
  vx,
  width,
  canGoNext,
  canGoPrevious,
}: TurnDecisionInput): MushafTurn {
  if (width <= 0) return null;

  const distanceThreshold = width * MUSHAF_TURN_DISTANCE_RATIO;
  if (canGoNext && (dx >= distanceThreshold || vx >= MUSHAF_TURN_VELOCITY)) {
    return "next";
  }
  if (canGoPrevious && (dx <= -distanceThreshold || vx <= -MUSHAF_TURN_VELOCITY)) {
    return "previous";
  }
  return null;
}

export function shouldClaimMushafSwipe(dx: number, dy: number): boolean {
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  return horizontal >= MUSHAF_SWIPE_START_PX && horizontal > vertical * MUSHAF_SWIPE_AXIS_RATIO;
}

export function applyMushafEdgeResistance(
  dx: number,
  width: number,
  canGoNext: boolean,
  canGoPrevious: boolean,
): number {
  if (width <= 0) return 0;

  const maxTravel = width * 1.05;
  const bounded = Math.max(-maxTravel, Math.min(maxTravel, dx));

  if (bounded > 0 && !canGoNext) return bounded * 0.18;
  if (bounded < 0 && !canGoPrevious) return bounded * 0.18;
  return bounded;
}
