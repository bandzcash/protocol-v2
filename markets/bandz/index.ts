import { oneRay, ZERO_ADDRESS } from '../../helpers/constants';
import { IBandzConfiguration, eSmartBCHNetwork } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyDAI,
  strategyBANDZ,
  strategyUNI,
  strategyWBCH,
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
    WBCH: strategyWBCH,
    xSUSHI: strategyXSUSHI,
  },
  ReserveAssets: {
    [eSmartBCHNetwork.buidlerevm]: {},
    [eSmartBCHNetwork.hardhat]: {},
    [eSmartBCHNetwork.coverage]: {},
    [eSmartBCHNetwork.amber]: {
      BANDZ: '',
      DAI: '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108',
      WBCH: '0x17F4FCF5b6E0A95D4eE331c8529041896A073F9b',
    },
    [eSmartBCHNetwork.main]: {
      BANDZ: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      WBCH: '0x3743eC0673453E5009310C727Ba4eaF7b3a1cc04',
      xSUSHI: '0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272',
    },
  },
};

export default BandzConfig;
