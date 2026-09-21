import { describe, expect, it } from "vitest";
import {
  applyMushafEdgeResistance,
  decideMushafTurn,
  shouldClaimMushafSwipe,
} from "./mushaf-motion";

describe("Mushaf paging motion", () => {
  it("claims a deliberate horizontal gesture", () => {
    expect(shouldClaimMushafSwipe(24, 4)).toBe(true);
  });

  it("does not steal vertical scrolling", () => {
    expect(shouldClaimMushafSwipe(8, 28)).toBe(false);
    expect(shouldClaimMushafSwipe(4, 1)).toBe(false);
  });

  it("advances on a rightward RTL swipe past the distance threshold", () => {
    expect(
      decideMushafTurn({
        dx: 120,
        vx: 0.1,
        width: 400,
        canGoNext: true,
        canGoPrevious: true,
      }),
    ).toBe("next");
  });

  it("advances on sufficient rightward velocity even below the distance threshold", () => {
    expect(
      decideMushafTurn({
        dx: 40,
        vx: 0.7,
        width: 400,
        canGoNext: true,
        canGoPrevious: true,
      }),
    ).toBe("next");
  });

  it("returns to the previous page on a leftward RTL swipe", () => {
    expect(
      decideMushafTurn({
        dx: -120,
        vx: -0.1,
        width: 400,
        canGoNext: true,
        canGoPrevious: true,
      }),
    ).toBe("previous");
  });

  it("springs back when neither distance nor velocity is sufficient", () => {
    expect(
      decideMushafTurn({
        dx: 48,
        vx: 0.18,
        width: 400,
        canGoNext: true,
        canGoPrevious: true,
      }),
    ).toBeNull();
  });

  it("does not turn beyond the first or last page", () => {
    expect(
      decideMushafTurn({
        dx: -180,
        vx: -1,
        width: 400,
        canGoNext: true,
        canGoPrevious: false,
      }),
    ).toBeNull();
    expect(
      decideMushafTurn({
        dx: 180,
        vx: 1,
        width: 400,
        canGoNext: false,
        canGoPrevious: true,
      }),
    ).toBeNull();
  });

  it("adds gentle resistance at book boundaries", () => {
    expect(applyMushafEdgeResistance(100, 400, false, true)).toBe(18);
    expect(applyMushafEdgeResistance(-100, 400, true, false)).toBe(-18);
    expect(applyMushafEdgeResistance(100, 400, true, true)).toBe(100);
  });
});
