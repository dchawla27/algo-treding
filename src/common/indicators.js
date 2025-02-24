
const calculateATR = async (candles, multiplier, limit) => {
  const lows = candles.map((c) => +c.low);
  const highs = candles.map((c) => +c.high);
  const closes = candles.map((c) => +c.close);

  let TRResults = [];
  for (let x = 1; x < candles.length; x++) {
    TRResults.push(
      Math.max(
        highs[x] - lows[x],
        Math.abs(highs[x] - closes[x - 1]),
        Math.abs(lows[x] - closes[x - 1])
      )
    );
  }

  let RMA_TR_Results = [TRResults[0]];
  const alpha = 1 / limit;
  for (let x = 1; x < TRResults.length; x++) {
    RMA_TR_Results.push(
      alpha * TRResults[x] + (1 - alpha) * RMA_TR_Results[x - 1]
    );
  }

  return RMA_TR_Results[RMA_TR_Results.length - 1] * multiplier;
};

const calculateSuperTrend = async (candles, multiplier, limit) => {
  let upperBands = [];
  let lowerBands = [];
  let superTrends = [];

  for (let i = 0; i < candles.length; i++) {
    if (i >= limit * 4) {
      const lastCandle = +candles[i - 1].close;
      const currentCandle = +candles[i].close;
      const candlesATR = await calculateATR(candles.slice(i - (limit * 4), i), multiplier, limit);

      const basicUpperBand = (candles[i].high + candles[i].low) / 2 - candlesATR;
      const basicLowerBand = (candles[i].high + candles[i].low) / 2 + candlesATR;

      if (i === limit * 4) {
        upperBands.push(basicUpperBand);
        lowerBands.push(basicLowerBand);
        superTrends.push(true);
      } else {
        const lastUpperBand = upperBands[upperBands.length - 1];
        const lastLowerBand = lowerBands[lowerBands.length - 1];

        upperBands.push(
          lastCandle > lastUpperBand
            ? Math.max(basicUpperBand, lastUpperBand)
            : basicUpperBand
        );
        lowerBands.push(
          lastCandle < lastLowerBand
            ? Math.min(basicLowerBand, lastLowerBand)
            : basicLowerBand
        );

        const lastSuperTrend = superTrends[superTrends.length - 1];
        superTrends.push(
          !lastSuperTrend && currentCandle > lastLowerBand
            ? true
            : lastSuperTrend && currentCandle < lastUpperBand
            ? false
            : lastSuperTrend
        );
      }
    }
  }

  return {
    latestSuperTrend: superTrends[superTrends.length - 1],
    latestUpperBand: parseInt(upperBands[upperBands.length - 1]),
    latestLowerBand: parseInt(lowerBands[lowerBands.length - 1])
  };
};

// Export the functions for use in other files
module.exports = {
  calculateATR,
  calculateSuperTrend
};
