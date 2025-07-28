const { calculateDistance } = require("../controllers/orderController");

describe("calculateDistance", () => {
  it("returns 0 for the same point", () => {
    expect(calculateDistance(0, 0, 0, 0)).toBeCloseTo(0);
  });

  it("calculates correct distance between two known points", () => {
    // Example: Cairo (30.0444, 31.2357) to Alexandria (31.2001, 29.9187)
    const distance = calculateDistance(30.0444, 31.2357, 31.2001, 29.9187);
    expect(distance).toBeGreaterThan(175); // Should be about 180km
    expect(distance).toBeLessThan(200);
  });
});
