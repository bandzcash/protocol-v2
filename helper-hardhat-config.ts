// @ts-ignore
import { HardhatNetworkForkingUserConfig, HardhatUserConfig } from 'hardhat/types';
import {
  eSmartBCHNetwork,
  iParamsPerNetwork,
} from './helpers/types';

require('dotenv').config();

const TENDERLY_FORK_ID = process.env.TENDERLY_FORK_ID || '';
const FORK = process.env.FORK || '';
const FORK_BLOCK_NUMBER = process.env.FORK_BLOCK_NUMBER
  ? parseInt(process.env.FORK_BLOCK_NUMBER)
  : 0;

const GWEI = 1000 * 1000 * 1000;

export const buildForkConfig = (): HardhatNetworkForkingUserConfig | undefined => {
  let forkMode;
  if (FORK) {
    forkMode = {
      url: NETWORKS_RPC_URL[FORK],
    };
    if (FORK_BLOCK_NUMBER || BLOCK_TO_FORK[FORK]) {
      forkMode.blockNumber = FORK_BLOCK_NUMBER || BLOCK_TO_FORK[FORK];
    }
  }
  return forkMode;
};

export const NETWORKS_RPC_URL: iParamsPerNetwork<string> = {
  [eSmartBCHNetwork.amber]: 'https://smartbch.fountainhead.cash/testnet',
  [eSmartBCHNetwork.main]: 'https://smartbch.fountainhead.cash/mainnet',
  [eSmartBCHNetwork.coverage]: 'http://localhost:8555',
  [eSmartBCHNetwork.hardhat]: 'http://localhost:8545',
  [eSmartBCHNetwork.buidlerevm]: 'http://localhost:8545',
  [eSmartBCHNetwork.tenderly]: `https://rpc.tenderly.co/fork/`,
};

export const NETWORKS_DEFAULT_GAS: iParamsPerNetwork<number> = {
  [eSmartBCHNetwork.amber]: 65 * GWEI,
  [eSmartBCHNetwork.main]: 65 * GWEI,
  [eSmartBCHNetwork.coverage]: 65 * GWEI,
  [eSmartBCHNetwork.hardhat]: 65 * GWEI,
  [eSmartBCHNetwork.buidlerevm]: 65 * GWEI,
  [eSmartBCHNetwork.tenderly]: 1 * GWEI,
};

export const BLOCK_TO_FORK: iParamsPerNetwork<number | undefined> = {
  [eSmartBCHNetwork.main]: 12406069,
  [eSmartBCHNetwork.amber]: undefined,
  [eSmartBCHNetwork.coverage]: undefined,
  [eSmartBCHNetwork.hardhat]: undefined,
  [eSmartBCHNetwork.buidlerevm]: undefined,
  [eSmartBCHNetwork.tenderly]: undefined,
};
