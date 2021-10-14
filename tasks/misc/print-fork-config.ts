import { task } from 'hardhat/config';
import { getAaveProtocolDataProvider } from '../../helpers/contracts-getters';

task('print-config:fork', 'Deploy development enviroment')
  .addFlag('verify', 'Verify contracts at SmartScan')
  .setAction(async ({ verify }, DRE) => {
    await DRE.run('set-DRE');
    await DRE.run('bandz:mainnet');

    const dataProvider = await getAaveProtocolDataProvider();
    await DRE.run('print-config', { dataProvider: dataProvider.address, pool: 'Aave' });
  });
