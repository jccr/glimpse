type Row = string[];

export function isNumeric(value: string) {
  return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
}

export function checkNonNumeric(row: Row) {
  const nonNumericCount = row.filter((value) => !isNumeric(value)).length;
  return nonNumericCount > row.length / 2;
}

export function checkColumnConsistency(firstRow: Row, secondRow: Row) {
  const firstRowTypes = firstRow.map((value) =>
    isNumeric(value) ? "numeric" : "string",
  );
  const secondRowTypes = secondRow.map((value) =>
    isNumeric(value) ? "numeric" : "string",
  );
  return firstRowTypes.join() !== secondRowTypes.join();
}

export function checkStatisticalVariance(firstRow: Row, sampleRows: Row[]) {
  const firstRowTypes = firstRow.map((value) =>
    isNumeric(value) ? "numeric" : "string",
  );
  const sampleTypes = sampleRows.map((row) =>
    row.map((value) => (isNumeric(value) ? "numeric" : "string")),
  );
  const variance = sampleTypes.reduce(
    (acc, types) => acc + (types.join() !== firstRowTypes.join() ? 1 : 0),
    0,
  );
  return variance > sampleRows.length / 2;
}

export function hasHeaders(firstRow: Row, sampleRows: Row[]) {
  console.log(firstRow, sampleRows);
  const nonNumeric = checkNonNumeric(firstRow);
  const columnConsistency = checkColumnConsistency(firstRow, sampleRows[0]);
  const statisticalVariance = checkStatisticalVariance(firstRow, sampleRows);
  console.log(
    "nonNumeric",
    nonNumeric,
    "columnConsistency",
    columnConsistency,
    "statisticalVariance",
    statisticalVariance,
  );
  return nonNumeric && columnConsistency && statisticalVariance;
}
