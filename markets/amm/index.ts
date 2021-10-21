import { oneRay, ZERO_ADDRESS } from '../../helpers/constants';
import { IAmmConfiguration, eSmartBCHNetwork } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyDAI,
  strategyWETH,
  strategyDAIWETH,
  strategyBANDZWETH,
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
    WBCH: strategyWETH,
    DAI: strategyDAI,
  },
  ReserveAssets: {
    [eSmartBCHNetwork.buidlerevm]: {},
    [eSmartBCHNetwork.hardhat]: {},
    [eSmartBCHNetwork.coverage]: {},
    [eSmartBCHNetwork.amber]: {},
    [eSmartBCHNetwork.main]: {
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      WBCH: '0x3743eC0673453E5009310C727Ba4eaF7b3a1cc04',
    },
  },
};

export default AmmConfig;
