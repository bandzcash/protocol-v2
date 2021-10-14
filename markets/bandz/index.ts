import { oneRay, ZERO_ADDRESS } from '../../helpers/constants';
import { IBandzConfiguration, eSmartBCHNetwork } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyDAI,
  strategyUSDC,
  strategyBANDZ,
  strategyLINK,
  strategyMKR,
  strategyUNI,
  strategyWETH,
  strategyXSUSHI,
} from './reservesConfigs';

// ----------------
// POOL--SPECIFIC PARAMS
// ----------------

export const BandzConfig: IBandzConfiguration = {
  ...CommonsConfig,
  MarketId: 'Bandz genesis market',
  ProviderId: 1,
  ReservesConfig: {
    BANDZ: strategyBANDZ,
    DAI: strategyDAI,
    LINK: strategyLINK,
    MKR: strategyMKR,
    USDC: strategyUSDC,
    WETH: strategyWETH,
    xSUSHI: strategyXSUSHI,
  },
  ReserveAssets: {
    [eSmartBCHNetwork.buidlerevm]: {},
    [eSmartBCHNetwork.hardhat]: {},
    [eSmartBCHNetwork.coverage]: {},
    [eSmartBCHNetwork.amber]: {
      BANDZ: '',
      DAI: '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108',
      LINK: '0x1a906E71FF9e28d8E01460639EB8CF0a6f0e2486',
      MKR: '0x2eA9df3bABe04451c9C3B06a2c844587c59d9C37',
      USDC: '0x851dEf71f0e6A903375C1e536Bd9ff1684BAD802',
      WETH: '0xc778417e063141139fce010982780140aa0cd5ab',
    },
    [eSmartBCHNetwork.main]: {
      BANDZ: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      MKR: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      xSUSHI: '0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272',
    },
  },
};

export default BandzConfig;
