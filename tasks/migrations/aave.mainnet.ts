import { task } from 'hardhat/config';
import { checkVerification } from '../../helpers/smartscan-verification';
import { ConfigNames } from '../../helpers/configuration';
import { printContracts } from '../../helpers/misc-utils';

task('bandz:mainnet', 'Deploy development enviroment')
  .addFlag('verify', 'Verify contracts at SmartScan')
  .addFlag('skipRegistry', 'Skip addresses provider registration at Addresses Provider Registry')
  .setAction(async ({ verify, skipRegistry }, DRE) => {
    const POOL_NAME = ConfigNames.Bandz;
    await DRE.run('set-DRE');

    // Prevent loss of gas verifying all the needed ENVs for SmartScan verification
    if (verify) {
      checkVerification();
    }

    console.log('Migration started\n');

    console.log('1. Deploy address provider');
    await DRE.run('full:deploy-address-provider', { pool: POOL_NAME, skipRegistry });

    console.log('2. Deploy lending pool');
    await DRE.run('full:deploy-lending-pool', { pool: POOL_NAME });

    console.log('3. Deploy oracles');
    await DRE.run('full:deploy-oracles', { pool: POOL_NAME });

    console.log('4. Deploy Data Provider');
    await DRE.run('full:data-provider', { pool: POOL_NAME });

    console.log('5. Deploy WBCH Gateway');
    await DRE.run('full-deploy-wbch-gateway', { pool: POOL_NAME });

    console.log('6. Initialize lending pool');
    await DRE.run('full:initialize-lending-pool', { pool: POOL_NAME });

    if (verify) {
      printContracts();
      console.log('7. Veryfing contracts');
      await DRE.run('verify:general', { all: true, pool: POOL_NAME });

      console.log('8. Veryfing aTokens and debtTokens');
      await DRE.run('verify:tokens', { pool: POOL_NAME });
    }

    console.log('\nFinished migrations');
    printContracts();
  });
