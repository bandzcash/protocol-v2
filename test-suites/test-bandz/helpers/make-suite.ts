import { evmRevert, evmSnapshot, DRE } from '../../../helpers/misc-utils';
import { Signer } from 'ethers';
import {
  getLendingPool,
  getLendingPoolAddressesProvider,
  getAaveProtocolDataProvider,
  getAToken,
  getMintableERC20,
  getLendingPoolConfiguratorProxy,
  getPriceOracle,
  getLendingPoolAddressesProviderRegistry,
  getWBCHMocked,
  getWBCHGateway,
  getUniswapLiquiditySwapAdapter,
  getUniswapRepayAdapter,
  getFlashLiquidationAdapter,
  getParaSwapLiquiditySwapAdapter,
} from '../../../helpers/contracts-getters';
import { eSmartBCHNetwork, eNetwork, tSmartBCHAddress } from '../../../helpers/types';
import { LendingPool } from '../../../types/LendingPool';
import { AaveProtocolDataProvider } from '../../../types/AaveProtocolDataProvider';
import { MintableERC20 } from '../../../types/MintableERC20';
import { AToken } from '../../../types/AToken';
import { LendingPoolConfigurator } from '../../../types/LendingPoolConfigurator';

import chai from 'chai';
// @ts-ignore
import bignumberChai from 'chai-bignumber';
import { almostEqual } from './almost-equal';
import { PriceOracle } from '../../../types/PriceOracle';
import { LendingPoolAddressesProvider } from '../../../types/LendingPoolAddressesProvider';
import { LendingPoolAddressesProviderRegistry } from '../../../types/LendingPoolAddressesProviderRegistry';
import { getEthersSigners } from '../../../helpers/contracts-helpers';
import { UniswapLiquiditySwapAdapter } from '../../../types/UniswapLiquiditySwapAdapter';
import { UniswapRepayAdapter } from '../../../types/UniswapRepayAdapter';
import { ParaSwapLiquiditySwapAdapter } from '../../../types/ParaSwapLiquiditySwapAdapter';
import { getParamPerNetwork } from '../../../helpers/contracts-helpers';
import { WETH9Mocked } from '../../../types/WETH9Mocked';
import { WETHGateway } from '../../../types/WETHGateway';
import { solidity } from 'ethereum-waffle';
import { BandzConfig } from '../../../markets/bandz';
import { FlashLiquidationAdapter } from '../../../types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

chai.use(bignumberChai());
chai.use(almostEqual());
chai.use(solidity);

export interface SignerWithAddress {
  signer: Signer;
  address: tSmartBCHAddress;
}
export interface TestEnv {
  deployer: SignerWithAddress;
  users: SignerWithAddress[];
  pool: LendingPool;
  configurator: LendingPoolConfigurator;
  oracle: PriceOracle;
  helpersContract: AaveProtocolDataProvider;
  wbch: WETH9Mocked;
  aWBCH: AToken;
  flexUsd: MintableERC20;
  aFlexUsd: AToken;
  bandz: MintableERC20;
  addressesProvider: LendingPoolAddressesProvider;
  uniswapLiquiditySwapAdapter: UniswapLiquiditySwapAdapter;
  uniswapRepayAdapter: UniswapRepayAdapter;
  registry: LendingPoolAddressesProviderRegistry;
  wbchGateway: WETHGateway;
  flashLiquidationAdapter: FlashLiquidationAdapter;
  paraswapLiquiditySwapAdapter: ParaSwapLiquiditySwapAdapter;
}

let buidlerevmSnapshotId: string = '0x1';
const setBuidlerevmSnapshotId = (id: string) => {
  buidlerevmSnapshotId = id;
};

const testEnv: TestEnv = {
  deployer: {} as SignerWithAddress,
  users: [] as SignerWithAddress[],
  pool: {} as LendingPool,
  configurator: {} as LendingPoolConfigurator,
  helpersContract: {} as AaveProtocolDataProvider,
  oracle: {} as PriceOracle,
  wbch: {} as WETH9Mocked,
  aWBCH: {} as AToken,
  flexUsd: {} as MintableERC20,
  aFlexUsd: {} as AToken,
  bandz: {} as MintableERC20,
  addressesProvider: {} as LendingPoolAddressesProvider,
  uniswapLiquiditySwapAdapter: {} as UniswapLiquiditySwapAdapter,
  uniswapRepayAdapter: {} as UniswapRepayAdapter,
  flashLiquidationAdapter: {} as FlashLiquidationAdapter,
  paraswapLiquiditySwapAdapter: {} as ParaSwapLiquiditySwapAdapter,
  registry: {} as LendingPoolAddressesProviderRegistry,
  wbchGateway: {} as WETHGateway,
} as TestEnv;

export async function initializeMakeSuite() {
  const [_deployer, ...restSigners] = await getEthersSigners();
  const deployer: SignerWithAddress = {
    address: await _deployer.getAddress(),
    signer: _deployer,
  };

  for (const signer of restSigners) {
    testEnv.users.push({
      signer,
      address: await signer.getAddress(),
    });
  }
  testEnv.deployer = deployer;
  testEnv.pool = await getLendingPool();

  testEnv.configurator = await getLendingPoolConfiguratorProxy();

  testEnv.addressesProvider = await getLendingPoolAddressesProvider();

  if (process.env.FORK) {
    testEnv.registry = await getLendingPoolAddressesProviderRegistry(
      getParamPerNetwork(BandzConfig.ProviderRegistry, process.env.FORK as eNetwork)
    );
  } else {
    testEnv.registry = await getLendingPoolAddressesProviderRegistry();
    testEnv.oracle = await getPriceOracle();
  }

  testEnv.helpersContract = await getAaveProtocolDataProvider();

  const allTokens = await testEnv.helpersContract.getAllATokens();

  const aflexUsdAddress = allTokens.find((aToken) => aToken.symbol === 'aFLEXUSD')?.tokenAddress;

  const aWBchAddress = allTokens.find((aToken) => aToken.symbol === 'aWBCH')?.tokenAddress;

  const reservesTokens = await testEnv.helpersContract.getAllReservesTokens();

  const flexUsdAddress = reservesTokens.find((token) => token.symbol === 'FLEXUSD')?.tokenAddress;
  const bandzAddress = reservesTokens.find((token) => token.symbol === 'BANDZ')?.tokenAddress;
  const wbchAddress = reservesTokens.find((token) => token.symbol === 'WBCH')?.tokenAddress;

  if (!aflexUsdAddress || !aWBchAddress) {
    process.exit(1);
  }
  if (!flexUsdAddress || !bandzAddress || !wbchAddress) {
    process.exit(1);
  }

  testEnv.aFlexUsd = await getAToken(aflexUsdAddress);
  testEnv.aWBCH = await getAToken(aWBchAddress);

  testEnv.flexUsd = await getMintableERC20(flexUsdAddress);
  testEnv.bandz = await getMintableERC20(bandzAddress);
  testEnv.wbch = await getWBCHMocked(wbchAddress);
  testEnv.wbchGateway = await getWBCHGateway();

  testEnv.uniswapLiquiditySwapAdapter = await getUniswapLiquiditySwapAdapter();
  testEnv.uniswapRepayAdapter = await getUniswapRepayAdapter();
  testEnv.flashLiquidationAdapter = await getFlashLiquidationAdapter();

  testEnv.paraswapLiquiditySwapAdapter = await getParaSwapLiquiditySwapAdapter();
}

const setSnapshot = async () => {
  const hre = DRE as HardhatRuntimeEnvironment;
  setBuidlerevmSnapshotId(await evmSnapshot());
};

const revertHead = async () => {
  const hre = DRE as HardhatRuntimeEnvironment;
  await evmRevert(buidlerevmSnapshotId);
};

export function makeSuite(name: string, tests: (testEnv: TestEnv) => void) {
  describe(name, () => {
    before(async () => {
      await setSnapshot();
    });
    tests(testEnv);
    after(async () => {
      await revertHead();
    });
  });
}
