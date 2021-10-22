import { eContractid, IReserveParams} from '../../helpers/types';
import {
  rateStrategyAmmBase,
  rateStrategyStable,
  rateStrategyBaseOne,
} from './rateStrategies';


export const strategyWBCH: IReserveParams = {
  strategy: rateStrategyBaseOne,
  baseLTVAsCollateral: '8000',
  liquidationThreshold: '8250',
  liquidationBonus: '10500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '1000'
};

export const strategyFlexUSD: IReserveParams = {
  strategy: rateStrategyStable,
  baseLTVAsCollateral: '7500',
  liquidationThreshold: '8000',
  liquidationBonus: '10500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '1000'
};

export const strategyFlexUSDWBCH: IReserveParams = {
  strategy: rateStrategyAmmBase,
  baseLTVAsCollateral: '6000',
  liquidationThreshold: '7000',
  liquidationBonus: '11500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '1000'
};

export const strategyBANDZWBCH: IReserveParams = {
  strategy: rateStrategyAmmBase,
  baseLTVAsCollateral: '6000',
  liquidationThreshold: '7000',
  liquidationBonus: '11500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '500'
};

// export const strategyYFIWBCH: IReserveParams = {
//   strategy: rateStrategyAmmBase,
//   baseLTVAsCollateral: '5000',
//   liquidationThreshold: '6000',
//   liquidationBonus: '11500',
//   borrowingEnabled: true,
//   stableBorrowRateEnabled: false,
//   reserveDecimals: '18',
//   aTokenImpl: eContractid.AToken,
//   reserveFactor: '1500'
// };

export const strategyBALWBCH: IReserveParams = {
  strategy: rateStrategyAmmBase,
  baseLTVAsCollateral: '6000',
  liquidationThreshold: '7000',
  liquidationBonus: '11500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '1500'
}