import { eContractid, IReserveParams } from '../../helpers/types';

import {
  rateStrategyStableOne,
  rateStrategyStableTwo,
  rateStrategyStableThree,
  rateStrategyWETH,
  rateStrategyBANDZ,
  rateStrategyVolatileOne,
  rateStrategyVolatileTwo,
  rateStrategyVolatileThree,
  rateStrategyVolatileFour,
} from './rateStrategies';

export const strategyDAI: IReserveParams = {
  strategy: rateStrategyStableTwo,
  baseLTVAsCollateral: '7500',
  liquidationThreshold: '8000',
  liquidationBonus: '10500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '1000',
};

export const strategyUSDC: IReserveParams = {
  strategy: rateStrategyStableThree,
  baseLTVAsCollateral: '8000',
  liquidationThreshold: '8500',
  liquidationBonus: '10500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: '6',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '1000',
};

export const strategyBANDZ: IReserveParams = {
  strategy: rateStrategyBANDZ,
  baseLTVAsCollateral: '5000',
  liquidationThreshold: '6500',
  liquidationBonus: '11000',
  borrowingEnabled: false,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '0',
};

export const strategyWETH: IReserveParams = {
  strategy: rateStrategyWETH,
  baseLTVAsCollateral: '8000',
  liquidationThreshold: '8250',
  liquidationBonus: '10500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '1000',
};

export const strategyLINK: IReserveParams = {
  strategy: rateStrategyVolatileOne,
  baseLTVAsCollateral: '7000',
  liquidationThreshold: '7500',
  liquidationBonus: '11000',
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '2000',
};

export const strategyMKR: IReserveParams = {
  strategy: rateStrategyVolatileOne,
  baseLTVAsCollateral: '6000',
  liquidationThreshold: '6500',
  liquidationBonus: '11000',
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '2000',
};

// Invalid borrow rates in params currently, replaced with snx params
export const strategyUNI: IReserveParams = {
  strategy: rateStrategyVolatileThree,
  baseLTVAsCollateral: '6000',
  liquidationThreshold: '6500',
  liquidationBonus: '11000',
  borrowingEnabled: false,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.DelegationAwareAToken,
  reserveFactor: '2000',
};

export const strategyXSUSHI: IReserveParams = {
  strategy: rateStrategyVolatileFour,
  baseLTVAsCollateral: '2500',
  liquidationThreshold: '4500',
  liquidationBonus: '11500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '3500',
};
