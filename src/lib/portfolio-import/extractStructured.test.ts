import { describe, expect, it } from 'vitest';
import { extractFromCsv, rowsToHoldings } from './extractStructured';

describe('rowsToHoldings', () => {
  it('maps rows under a recognizable header row, splitting symbol vs name', () => {
    const rows = [
      ['Symbol', 'Quantity', 'Avg Price'],
      ['TCS', '10', '3200'],
      ['Tata Consultancy Services', '5', '3300'],
    ];
    expect(rowsToHoldings(rows)).toEqual([
      { rawSymbol: 'TCS', rawName: null, quantity: 10, avgPrice: 3200 },
      { rawSymbol: null, rawName: 'Tata Consultancy Services', quantity: 5, avgPrice: 3300 },
    ]);
  });

  it('finds the header even when it is not the first row', () => {
    const rows = [
      ['My broker export'],
      [],
      ['Scrip', 'Shares', 'Buy Price'],
      ['INFY', '3', '1500'],
    ];
    expect(rowsToHoldings(rows)).toEqual([
      { rawSymbol: 'INFY', rawName: null, quantity: 3, avgPrice: 1500 },
    ]);
  });

  it('recognizes varied header phrasing across columns', () => {
    const rows = [
      ['Stock Name', 'No. of Shares', 'Average Cost'],
      ['HDFC Bank', '20', '1600'],
    ];
    expect(rowsToHoldings(rows)).toEqual([
      { rawSymbol: null, rawName: 'HDFC Bank', quantity: 20, avgPrice: 1600 },
    ]);
  });

  it('skips rows with a missing or non-positive quantity/price', () => {
    const rows = [
      ['Symbol', 'Quantity', 'Avg Price'],
      ['TCS', '0', '3200'],
      ['INFY', '5', ''],
      ['HDFCBANK', '10', '1600'],
    ];
    expect(rowsToHoldings(rows)).toEqual([
      { rawSymbol: 'HDFCBANK', rawName: null, quantity: 10, avgPrice: 1600 },
    ]);
  });

  it('returns null when no header row is recognizable', () => {
    const rows = [
      ['Just', 'some', 'text'],
      ['1', '2', '3'],
    ];
    expect(rowsToHoldings(rows)).toBeNull();
  });

  it('returns null when the header matches but every data row is invalid', () => {
    const rows = [['Symbol', 'Quantity', 'Avg Price']];
    expect(rowsToHoldings(rows)).toBeNull();
  });
});

describe('extractFromCsv', () => {
  it('parses a real CSV string end to end', () => {
    const csv = 'Symbol,Quantity,Avg Price\nRELIANCE,15,2400\nTCS,10,3200\n';
    expect(extractFromCsv(csv)).toEqual([
      { rawSymbol: 'RELIANCE', rawName: null, quantity: 15, avgPrice: 2400 },
      { rawSymbol: 'TCS', rawName: null, quantity: 10, avgPrice: 3200 },
    ]);
  });
});
