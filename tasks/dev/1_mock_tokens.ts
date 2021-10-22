import { task } from 'hardhat/config';
import { deployAllMockTokens } from '../../helpers/contracts-deployments';

task('dev:deploy-mock-tokens', 'Deploy mock tokens for dev enviroment')
  .addFlag('verify', 'Verify contracts at SmartScan')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-DRE');
    await deployAllMockTokens(verify);
  });
