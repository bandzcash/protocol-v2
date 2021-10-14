import { oneRay, ZERO_ADDRESS } from '../../helpers/constants';
import { IAmmConfiguration, eSmartBCHNetwork } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyDAI,
  strategyUSDC,
  strategyWETH,
  strategyDAIWETH,
  strategyBANDZWETH,
  strategyDAIUSDC,
  strategyCRVWETH,
  strategyLINKWETH,
  strategyMKRWETH,
  strategyUSDCWETH,
  // strategyYFIWETH,
  strategyBALWETH,
} from './reservesConfigs';

// ----------------
// POOL--SPECIFIC PARAMS
// ----------------

export const AmmConfig: IAmmConfiguration = {
  ...CommonsConfig,
  MarketId: 'Bandz AMM market',
  ProviderId: 2,
  ReservesConfig: {
    WETH: strategyWETH,
    DAI: strategyDAI,
    USDC: strategyUSDC,
  },
  ReserveAssets: {
    [eSmartBCHNetwork.buidlerevm]: {},
    [eSmartBCHNetwork.hardhat]: {},
    [eSmartBCHNetwork.coverage]: {},
    [eSmartBCHNetwork.amber]: {},
    [eSmartBCHNetwork.main]: {
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
  },
};

export default AmmConfig;
