import { tSmartBCHAddress } from './types';
import { MockAggregator } from '../types/MockAggregator';
import { MockTokenMap } from './contracts-helpers';

export const getAllTokenAddresses = (mockTokens: MockTokenMap) =>
  Object.entries(mockTokens).reduce(
    (accum: { [tokenSymbol: string]: tSmartBCHAddress }, [tokenSymbol, tokenContract]) => ({
      ...accum,
      [tokenSymbol]: tokenContract.address,
    }),
    {}
  );
export const getAllAggregatorsAddresses = (mockAggregators: {
  [tokenSymbol: string]: MockAggregator;
}) =>
  Object.entries(mockAggregators).reduce(
    (accum: { [tokenSymbol: string]: tSmartBCHAddress }, [tokenSymbol, aggregator]) => ({
      ...accum,
      [tokenSymbol]: aggregator.address,
    }),
    {}
  );
