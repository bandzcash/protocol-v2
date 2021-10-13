import { task } from 'hardhat/config';
import { getBandzProtocolDataProvider } from '../../helpers/contracts-getters';

task('print-config:fork', 'Deploy development enviroment')
  .addFlag('verify', 'Verify contracts at SmartScan')
  .setAction(async ({ verify }, DRE) => {
    await DRE.run('set-DRE');
    await DRE.run('bandz:mainnet');

    const dataProvider = await getBandzProtocolDataProvider();
    await DRE.run('print-config', { dataProvider: dataProvider.address, pool: 'Bandz' });
  });
