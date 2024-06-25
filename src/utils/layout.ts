/* layout specified as number of items on each row */
export type Layout = number[];


const nToPossibleLayouts: { [key: number]: Layout[] } = {
  1: [[1]],
  2: [[2], [1, 1]],
  3: [[3], [1, 2], [1, 1, 1]],
  4: [[4], [2, 2], [1, 1, 1, 1]],
  5: [[5], [2, 3], [1, 1, 1, 1, 1]],
  6: [[6], [2, 2, 2], [3, 3], [1, 1, 1, 1, 1]],
  7: [[7], [3, 4], [1, 1, 1, 1, 1, 1, 1]],
  8: [[8], [2, 2, 2, 2], [3, 2, 3], [4, 4], [1, 1, 1, 1, 1, 1, 1, 1]],
  9: [[9], [3, 3, 3], [1, 1, 1, 1, 1, 1, 1, 1, 1]]
};


export function getBestLayout(n: number, height: number, width: number): Layout {
  const layoutOptions = nToPossibleLayouts[n];
  const targetAspectRatio = height / width;

  const aspectRatios = layoutOptions.map(layout => {
    const nRows = layout.length;
    const nCols = Math.max(...layout);
    return nRows / nCols;
  });

  const absoluteDifferences = aspectRatios.map(aspectRatio => Math.abs(aspectRatio - targetAspectRatio));

  const idxMin = absoluteDifferences.indexOf(Math.min(...absoluteDifferences));
  return layoutOptions[idxMin];
}
