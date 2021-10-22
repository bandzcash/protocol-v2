import { task } from 'hardhat/config';
import { getParamPerNetwork } from '../../helpers/contracts-helpers';
import {
  deployLendingPoolCollateralManager,
  deployWalletBalancerProvider,
  authorizeWBCHGateway,
  deployUiPoolDataProvider,
} from '../../helpers/contracts-deployments';
import { loadPoolConfig, ConfigNames, getTreasuryAddress } from '../../helpers/configuration';
import { getWBCHGateway } from '../../helpers/contracts-getters';
import { eNetwork, ICommonConfiguration } from '../../helpers/types';
import { notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import { initReservesByHelper, configureReservesByHelper } from '../../helpers/init-helpers';
import { exit } from 'process';
import {
  getAaveProtocolDataProvider,
  getLendingPoolAddressesProvider,
} from '../../helpers/contracts-getters';
import { ZERO_ADDRESS } from '../../helpers/constants';

task('full:initialize-lending-pool', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at SmartScan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const {
        ATokenNamePrefix,
        StableDebtTokenNamePrefix,
        VariableDebtTokenNamePrefix,
        SymbolPrefix,
        ReserveAssets,
        ReservesConfig,
        LendingPoolCollateralManager,
        WbchGateway,
        IncentivesController,
      } = poolConfig as ICommonConfiguration;

      const reserveAssets = await getParamPerNetwork(ReserveAssets, network);
      const incentivesController = await getParamPerNetwork(IncentivesController, network);
      const addressesProvider = await getLendingPoolAddressesProvider();

      const testHelpers = await getAaveProtocolDataProvider();

      const admin = await addressesProvider.getPoolAdmin();
      const oracle = await addressesProvider.getPriceOracle();

      if (!reserveAssets) {
        throw 'Reserve assets is undefined. Check ReserveAssets configuration at config directory';
      }

      const treasuryAddress = await getTreasuryAddress(poolConfig);

      await initReservesByHelper(
        ReservesConfig,
        reserveAssets,
        ATokenNamePrefix,
        StableDebtTokenNamePrefix,
        VariableDebtTokenNamePrefix,
        SymbolPrefix,
        admin,
        treasuryAddress,
        incentivesController,
        pool,
        verify
      );
      await configureReservesByHelper(ReservesConfig, reserveAssets, testHelpers, admin);

      let collateralManagerAddress = await getParamPerNetwork(
        LendingPoolCollateralManager,
        network
      );
      if (!notFalsyOrZeroAddress(collateralManagerAddress)) {
        const collateralManager = await deployLendingPoolCollateralManager(verify);
        collateralManagerAddress = collateralManager.address;
      }
      // Seems unnecessary to register the collateral manager in the JSON db

      console.log(
        '\tSetting lending pool collateral manager implementation with address',
        collateralManagerAddress
      );
      await waitForTx(
        await addressesProvider.setLendingPoolCollateralManager(collateralManagerAddress)
      );

      console.log(
        '\tSetting AaveProtocolDataProvider at AddressesProvider at id: 0x01',
        collateralManagerAddress
      );
      const bandzProtocolDataProvider = await getAaveProtocolDataProvider();
      await waitForTx(
        await addressesProvider.setAddress(
          '0x0100000000000000000000000000000000000000000000000000000000000000',
          bandzProtocolDataProvider.address
        )
      );

      await deployWalletBalancerProvider(verify);

      const uiPoolDataProvider = await deployUiPoolDataProvider(
        [incentivesController, oracle],
        verify
      );
      console.log('UiPoolDataProvider deployed at:', uiPoolDataProvider.address);

      const lendingPoolAddress = await addressesProvider.getLendingPool();

      let gateWay = getParamPerNetwork(WbchGateway, network);
      if (!notFalsyOrZeroAddress(gateWay)) {
        gateWay = (await getWBCHGateway()).address;
      }
      console.log('GATEWAY', gateWay);
      await authorizeWBCHGateway(gateWay, lendingPoolAddress);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
