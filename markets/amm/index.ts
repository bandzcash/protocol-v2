import { oneRay, ZERO_ADDRESS } from '../../helpers/constants';
import { IAmmConfiguration, eSmartBCHNetwork } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyFlexUSD,
  strategyWBCH,
  strategyFlexUSDWBCH,
  strategyBANDZWBCH,
  // strategyYFIWBCH,
  strategyBALWBCH,
} from './reservesConfigs';

// ----------------
// POOL--SPECIFIC PARAMS
// ----------------

export const AmmConfig: IAmmConfiguration = {
  ...CommonsConfig,
  MarketId: 'Bandz AMM market',
  ProviderId: 2,
  ReservesConfig: {
    WBCH: strategyWBCH,
    FLEXUSD: strategyFlexUSD,
  },
  ReserveAssets: {
    [eSmartBCHNetwork.buidlerevm]: {},
    [eSmartBCHNetwork.hardhat]: {},
    [eSmartBCHNetwork.coverage]: {},
    [eSmartBCHNetwork.amber]: {},
    [eSmartBCHNetwork.main]: {
      FLEXUSD: '0x7b2B3C5308ab5b2a1d9a94d20D35CCDf61e05b72',
      WBCH: '0x3743eC0673453E5009310C727Ba4eaF7b3a1cc04',
    },
  },
};

export default AmmConfig;
