import { task } from 'hardhat/config';
import {
  loadPoolConfig,
  ConfigNames,
  getWrappedNativeTokenAddress,
} from '../../helpers/configuration';
import { deployWETHGateway } from '../../helpers/contracts-deployments';

const CONTRACT_NAME = 'WETHGateway';

task(`full-deploy-wbch-gateway`, `Deploys the ${CONTRACT_NAME} contract`)
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addFlag('verify', `Verify ${CONTRACT_NAME} contract via SmartScan API.`)
  .setAction(async ({ verify, pool }, localBRE) => {
    await localBRE.run('set-DRE');
    const poolConfig = loadPoolConfig(pool);
    const Wbch = await getWrappedNativeTokenAddress(poolConfig);

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }
    const wbchGateWay = await deployWETHGateway([Wbch], verify);
    console.log(`${CONTRACT_NAME}.address`, wbchGateWay.address);
    console.log(`\tFinished ${CONTRACT_NAME} deployment`);
  });
