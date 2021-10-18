import { eContractid, IReserveParams} from '../../helpers/types';
import {
  rateStrategyAmmBase,
  rateStrategyStable,
  rateStrategyBaseOne,
} from './rateStrategies';


export const strategyWETH: IReserveParams = {
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

export const strategyDAI: IReserveParams = {
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

export const strategyDAIWETH: IReserveParams = {
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

export const strategyBANDZWETH: IReserveParams = {
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

export const strategyLINKWETH: IReserveParams = {
  strategy: rateStrategyAmmBase,
  baseLTVAsCollateral: '6000',
  liquidationThreshold: '7000',
  liquidationBonus: '11500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '1500'
};

export const strategyMKRWETH: IReserveParams = {
  strategy: rateStrategyAmmBase,
  baseLTVAsCollateral: '6000',
  liquidationThreshold: '7000',
  liquidationBonus: '11500',
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: '18',
  aTokenImpl: eContractid.AToken,
  reserveFactor: '1500'
};

// export const strategyYFIWETH: IReserveParams = {
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

export const strategyBALWETH: IReserveParams = {
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