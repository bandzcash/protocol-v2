import { task } from 'hardhat/config';
import { deployBandzProtocolDataProvider } from '../../helpers/contracts-deployments';
import { exit } from 'process';
import { getLendingPoolAddressesProvider } from '../../helpers/contracts-getters';

task('full:data-provider', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at SmartScan')
  .setAction(async ({ verify }, localBRE) => {
    try {
      await localBRE.run('set-DRE');

      const addressesProvider = await getLendingPoolAddressesProvider();

      await deployBandzProtocolDataProvider(addressesProvider.address, verify);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
